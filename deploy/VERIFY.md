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

## 2. Confirm spoofing is actually blocked — this is the important one

Send a request with a fabricated header for a hostname that has **no**
Redis mapping:

```bash
curl -s \
  -H "Host: not-a-real-academy.example.com" \
  -H "X-Saa9vi-Channel-Token: some-other-academys-real-token" \
  https://your-proxy/
```

The storefront should **not** see `some-other-academys-real-token`. If it
does, the header isn't being overwritten and the trust boundary is broken —
check that `/api/resolve-channel` is returning the header (even as `''`)
on this unmatched-hostname path, and that the proxy's copy/overwrite step
is unconditional (see the security notes in the Caddyfile / resolve_channel.js).

## 3. Confirm fail-open behavior

Stop Redis (or block the port), then repeat step 1. The request should
still succeed — served against the `VENDURE_CHANNEL_TOKEN` env var
fallback in `api.ts` — rather than the whole site 502ing. If it 502s
instead, check the subrequest timeout settings (nginx: `proxy_connect_timeout`/
`proxy_read_timeout` in `saa9vi-storefront.conf`; Caddy: `forward_auth`'s
behavior on a fully unreachable backend hasn't been stress-tested here and
is worth confirming directly against your Caddy version).

## 4. Latency sanity check

Both configs add one extra request (proxy → storefront → Redis) per
top-level page load. With Redis colocated on the same box as the
storefront, this should be low milliseconds and not worth optimizing away
up front — but worth a quick `curl -w '%{time_total}\n'` comparison against
the direct-to-Next.js port (bypassing the proxy) to confirm the overhead is
actually negligible in your environment before ruling it out as a future
concern.
