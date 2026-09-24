# Verifying the reverse-proxy channel resolution

Run these against staging before relying on either config in production. The
whole point of this setup is a trust boundary — worth confirming it actually
holds rather than assuming the config is correct because it deploys cleanly.

## 1. Confirm legitimate resolution works

```bash
curl -s -H "Host: academy-a.example.com" https://your-proxy/ -o /dev/null -w '%{http_code}\n'
```

Then check the storefront's own logs/response for evidence it received the
correct channel (e.g. temporarily log `getChannelTokenFromHeaders()`'s
result in `api.ts`, or check that the right academy's branding/products
render).

## 2. Confirm an unmapped public hostname is denied (B-6)

With Redis **up**, request a hostname that has no mapping:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Host: not-a-real-academy.example.com" https://your-proxy/
```

Expect **403**, with no storefront render. That means the whole chain holds:
`/api/resolve-channel` saw a healthy Redis and no mapping, answered `403`, and
the proxy refused the request before Next.js ran. If you get a **200**, an
unmapped tenant hostname is silently rendering the *default channel's*
storefront — the failure B-6 exists to prevent. Check that `route.ts` returns
`403` on this path and that the proxy propagates a non-2xx response
(`auth_request`: `403` only, never `404` — other statuses become a `500`;
Caddy: `forward_auth` denies on any non-2xx).

## 3. Confirm spoofing is still blocked

Repeat §2's request **with** a fabricated token — still expect `403`, because
the denial happens first:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Host: not-a-real-academy.example.com" \
  -H "X-Saa9vi-Channel-Token: some-other-academys-real-token" \
  https://your-proxy/
```

Then send the same fabricated token to a **mapped** hostname:

```bash
curl -s \
  -H "Host: academy-a.example.com" \
  -H "X-Saa9vi-Channel-Token: some-other-academys-real-token" \
  https://your-proxy/
```

Expect `200` for academy-a, and the storefront must **not** see
`some-other-academys-real-token`. If it does, the header isn't being
overwritten and the trust boundary is broken — check that
`/api/resolve-channel` always sets the header on a 200 and that the proxy's
copy/overwrite step is unconditional (see the security notes in the Caddyfile /
resolve_channel.js).

## 4. Confirm the Redis-outage fail-open path is intact

Stop Redis (or block the port), then repeat step 1 for a **mapped** hostname.
The request should still succeed — served against the `VENDURE_CHANNEL_TOKEN`
env var fallback in `api.ts` — rather than the whole site 502ing. The §2 denial
is deliberately *not* applied here: `/api/resolve-channel` distinguishes "Redis
answered: no mapping" (`403`, fail closed) from "Redis never answered" (`200` +
`''`, availability wins).

Distinguish that from a resolution **misconfiguration** (wrong
`REDIS_PASSWORD` against a password-protected Redis, a revoked ACL, ...): the
route answers **500** for those, on purpose — a lookup that is configured wrong
must fail loudly rather than quietly serving the default tenant to every
academy. So if §1 starts failing after a credential change, expect `500`s and
fix the configuration; don't "fix" it by making the route fail open again.

If you see a 502 instead of a served page, check the subrequest timeout
settings (nginx: `proxy_connect_timeout`/`proxy_read_timeout` in
`saa9vi-storefront.conf`; Caddy: `forward_auth`'s behavior on a fully
unreachable backend hasn't been stress-tested here and is worth confirming
directly against your Caddy version).

## 5. Latency sanity check

Both configs add one extra request (proxy → storefront → Redis) per
top-level page load. With Redis colocated on the same box as the
storefront, this should be low milliseconds and not worth optimizing away
up front — but worth a quick `curl -w '%{time_total}\n'` comparison against
the direct-to-Next.js port (bypassing the proxy) to confirm the overhead is
actually negligible in your environment before ruling it out as a future
concern.

## 6. Probe the route directly (no proxy needed)

Isolates "is the route right?" from "is the proxy right?" — useful both as a
pre-deployment check and when diagnosing a §2/§3 failure:

```bash
# mapped hostname → 200 + the token in both the header and the JSON body
curl -si 'http://localhost:3001/api/resolve-channel?hostname=academy-a.example.com' | head -1

# unmapped public hostname → 403 (Redis must be up — see §4 for the outage case)
curl -si 'http://localhost:3001/api/resolve-channel?hostname=not-a-real-academy.example.com' | head -1

# localhost/private address → 200 with an empty header
curl -si 'http://localhost:3001/api/resolve-channel?hostname=localhost' | head -1
```

All three responses carry `x-saa9vi-channel-token` (empty on the non-mapped
cases). If the mapped-probe 200s but §2's proxied request 200s too, the proxy is
dropping the denial — re-check the proxy's status handling, not the route.
