import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const KEY_PREFIX = 'channel-token:';

// The header name reverse proxies (Caddy's forward_auth, nginx+njs) copy
// onto the upstream request. See deploy/Caddyfile and deploy/nginx/*.
const RESPONSE_HEADER = 'x-saa9vi-channel-token';

let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (redis) return redis;
    try {
        redis = new Redis({
            host: REDIS_HOST,
            port: REDIS_PORT,
            password: REDIS_PASSWORD,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // no retry — fail fast
            lazyConnect: true,
        });
        redis.on('error', () => {
            redis = null;
        });
        return redis;
    } catch {
        return null;
    }
}

function isPrivateHostname(hostname: string): boolean {
    return (
        hostname === 'localhost' ||
        hostname.startsWith('localhost:') ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
    );
}

/**
 * --- Response contract: one invariant, one status rule ---
 *
 * INVARIANT: the x-saa9vi-channel-token header is ALWAYS set on the response —
 * to the real token, or to '' when there is none. This is the one correctness
 * rule that matters here: a header that's sometimes present and sometimes
 * absent forces every caller (proxy config, tests, future maintainers) to get
 * the "absent means what, exactly?" case right on their own. A header that's
 * always present and sometimes empty has exactly one meaning for '' — "no
 * tenant" — and callers built to copy/overwrite unconditionally (see the
 * Caddy/nginx configs) are correct by construction, with no ordering or
 * fail-open assumptions required.
 *
 * STATUS RULE (B-6): the header alone cannot express "unknown hostname must not
 * be served" versus "no tenant known, carry on", because proxies drop
 * empty-valued headers on the way upstream (nginx does not forward a
 * proxy_set_header whose value expands to ''), which makes the empty case
 * indistinguishable from "no header at all" once it reaches Next.js. The HTTP
 * status carries the distinction instead:
 *
 *   200 + header (token | '') → allowed. '' means "no tenant resolved" and the
 *       app's env-var fallback is the intended behaviour: local dev, private
 *       hostnames, and Redis *outages* (see deploy/VERIFY.md §3).
 *   403  → denied: Redis is healthy and answered authoritatively that this
 *       public hostname has no mapping. The proxy refuses the request before
 *       Next.js renders anything, so an unmapped tenant hostname can never
 *       fall back to the default channel's storefront (B-6 acceptance).
 *   500  → denied on a resolution *configuration* fault (e.g. Redis reachable
 *       but rejecting our credentials). Loud on purpose: a broken lookup must
 *       not silently serve the default tenant.
 *
 * 403 — not 404 — because nginx `auth_request` forwards only 2xx (allow) and
 * 401/403 (deny) to the client; any other status becomes an opaque 500, with
 * no way to tell "denied" from "proxy broken". 403 is the one status that
 * means "deny, and say so" identically under nginx (both configs) and Caddy's
 * forward_auth.
 */
function respondAllowed(channelToken: string | null) {
    const response = NextResponse.json({ channelToken });
    response.headers.set(RESPONSE_HEADER, channelToken ?? '');
    return response;
}

function respondDenied(status: 403 | 500, error: string, hostname: string) {
    const response = NextResponse.json(
        { channelToken: null, error, hostname },
        { status },
    );
    // Keep the always-present-header invariant even on denials: a proxy config
    // that (incorrectly) copied the header on a denied path would then forward
    // '', i.e. "no tenant" — never a value that could impersonate one.
    response.headers.set(RESPONSE_HEADER, '');
    return response;
}

/**
 * Failures that prove Redis was unreachable or timed out — an infrastructure
 * *outage*, where availability wins and we fall open to the env-var fallback
 * (deploy/VERIFY.md §3). Every other failure (auth/ACL misconfiguration,
 * unknown errors, ...) is treated as a resolution-configuration fault and fails
 * CLOSED, so a broken lookup can never silently render the default tenant's
 * storefront for a tenant hostname (B-6).
 */
const TRANSIENT_REDIS_FAILURE =
    /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN|NR_CLOSED|Connection is closed|max retries/i;

function isTransientRedisFailure(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code = (error as { code?: unknown }).code;
    const message = (error as { message?: unknown }).message;
    const haystack = `${typeof code === 'string' ? code : ''} ${
        typeof message === 'string' ? message : ''
    }`;
    return TRANSIENT_REDIS_FAILURE.test(haystack);
}

/**
 * GET /api/resolve-channel?hostname=academy.example.com
 *
 * Resolves a custom domain to a Vendure channel token via Redis. Returns the
 * token both as JSON body ({ channelToken }) and as the x-saa9vi-channel-token
 * response header — see the contract block above respondAllowed() for the full
 * status/header semantics.
 *
 * Called by the reverse proxy (nginx/Caddy), not the browser.
 *
 * Outcomes:
 *   200 + ''      → no tenant: localhost/private hostname (dev) or Redis
 *                   unreachable (infrastructure outage — fails open, VERIFY §3)
 *   200 + token   → resolved
 *   403           → Redis is healthy and has no mapping for this public
 *                   hostname: fail closed, the proxy denies the request (B-6)
 *   500           → resolution configuration fault (e.g. bad Redis
 *                   credentials): fail closed, loudly (B-6)
 */
export async function GET(request: NextRequest) {
    const hostname = request.nextUrl.searchParams.get('hostname');

    // No hostname at all, or a private/localhost address: never a production
    // resolution-enabled vhost, so the env-var fallback is intended here.
    if (!hostname || isPrivateHostname(hostname)) {
        return respondAllowed(null);
    }

    const client = getRedis();
    if (!client) {
        // Redis client could not even be constructed → outage → fail open.
        return respondAllowed(null);
    }

    try {
        const channelToken = await client.get(`${KEY_PREFIX}${hostname}`);
        if (!channelToken) {
            // Authoritative "no mapping for this public hostname" → fail closed.
            return respondDenied(403, 'hostname_not_mapped', hostname);
        }
        return respondAllowed(channelToken);
    } catch (error) {
        if (isTransientRedisFailure(error)) {
            return respondAllowed(null);
        }
        return respondDenied(500, 'channel_resolution_misconfigured', hostname);
    }
}
