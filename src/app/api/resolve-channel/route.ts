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
 * Build the response, ALWAYS setting the resolution header — to the real
 * token, or to '' when there is none. This is the one correctness rule
 * that matters here: a header that's sometimes present and sometimes
 * absent forces every caller (proxy config, tests, future maintainers)
 * to get the "absent means what, exactly?" case right on their own.
 * A header that's always present and sometimes empty has exactly one
 * meaning for '' — "no tenant" — and callers built to copy/overwrite
 * unconditionally (see the Caddy/nginx configs) are correct by
 * construction, with no ordering or fail-open assumptions required.
 */
function respond(channelToken: string | null) {
    const response = NextResponse.json({ channelToken });
    response.headers.set(RESPONSE_HEADER, channelToken ?? '');
    return response;
}

/**
 * GET /api/resolve-channel?hostname=academy.example.com
 *
 * Resolves a custom domain to a Vendure channel token via Redis.
 * Returns the token both as JSON body ({ channelToken }) and as the
 * x-saa9vi-channel-token response header (see respond() above for why
 * the header is always set, never conditionally).
 *
 * Called by the reverse proxy (nginx/Caddy), not the browser.
 * Falls back to null/'' if:
 *   - Redis is unavailable
 *   - No mapping exists for the given hostname
 *   - The hostname is localhost/a private IP (local dev — env var fallback applies)
 */
export async function GET(request: NextRequest) {
    const hostname = request.nextUrl.searchParams.get('hostname');

    if (!hostname || isPrivateHostname(hostname)) {
        return respond(null);
    }

    const client = getRedis();
    if (!client) {
        return respond(null);
    }

    try {
        const channelToken = await client.get(`${KEY_PREFIX}${hostname}`);
        return respond(channelToken ?? null);
    } catch {
        return respond(null);
    }
}
