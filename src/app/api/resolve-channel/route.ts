import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const KEY_PREFIX = 'channel-token:';

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

/**
 * GET /api/resolve-channel?hostname=academy.example.com
 *
 * Resolves a custom domain to a Vendure channel token via Redis.
 * Returns { channelToken: string | null }.
 *
 * Used by the Next.js middleware (proxy.ts) to set the x-saa9vi-channel-token
 * header for multi-tenant hostname-based channel resolution.
 *
 * Falls back to null if:
 *   - Redis is unavailable
 *   - No mapping exists for the given hostname
 *   - The hostname is localhost (local dev — use env var fallback)
 */
export async function GET(request: NextRequest) {
    const hostname = request.nextUrl.searchParams.get('hostname');

    if (!hostname) {
        return NextResponse.json({ channelToken: null });
    }

    // Localhost and IP addresses are always dev — skip Redis lookup
    if (
        hostname === 'localhost' ||
        hostname.startsWith('localhost:') ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
    ) {
        return NextResponse.json({ channelToken: null });
    }

    const client = getRedis();
    if (!client) {
        return NextResponse.json({ channelToken: null });
    }

    try {
        const channelToken = await client.get(`${KEY_PREFIX}${hostname}`);
        return NextResponse.json({ channelToken: channelToken ?? null });
    } catch {
        return NextResponse.json({ channelToken: null });
    }
}
