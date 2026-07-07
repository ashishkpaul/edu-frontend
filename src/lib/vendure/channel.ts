/**
 * Returns the channel token for cache-tag dimensioning and API calls.
 *
 * ⚠️ SYNCHRONOUS — This function MUST NOT use next/headers() because it
 *    is called from inside `'use cache'` scopes where dynamic data sources
 *    are forbidden by Next.js 16.
 *
 * Priority:
 *   1. VENDURE_CHANNEL_TOKEN env var (local dev / preview)
 *   2. NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN env var (public client fallback)
 *   3. __default_channel__ hardcoded fallback
 *
 * For per-request header-based channel resolution, api.ts handles that
 * internally via the channelToken option passed to query()/mutate().
 * That code CAN use next/headers() because it's NOT inside a 'use cache' scope.
 */
const VENDURE_CHANNEL_TOKEN: string =
    process.env.VENDURE_CHANNEL_TOKEN ||
    process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN ||
    '__default_channel__';

export function getChannelToken(): string {
    return VENDURE_CHANNEL_TOKEN;
}
