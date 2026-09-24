import {cacheLife, cacheTag} from 'next/cache';
import {getRouteLocale} from '@/i18n/server';
import {themeToCss, type TenantThemeStyle} from '@/lib/tenant-theme-css';
import {getChannelTokenFromHeaders, query} from './api';
import {GetMyTenantThemeQuery} from './queries';

/**
 * Fetch + resolve the ADR-043 L1 tenant theme for the current request.
 *
 * The mapping itself lives in `@/lib/tenant-theme-css` (pure, dependency-free);
 * this module only does the channel-scoped read and the caching.
 *
 * Boundary:
 *  - The **backend decides everything commercial**. `myTenantTheme` is
 *    `Permission.Public` but entitlement-conditional: it returns `null` unless
 *    the channel has an active theme AND its plan grants `whitelabelEnabled`
 *    (ADR-043 / INV-025). Nothing here re-evaluates that — `null` means "render
 *    the platform defaults already defined in `globals.css`".
 *
 * Marketplace / platform safety (ADR-043: no tenant theme may affect the
 * marketplace surface, the admin portal, or another tenant):
 *  - A theme is resolved **only** when the request carries a proxy-resolved
 *    tenant channel token. The marketplace vhost deliberately sends no channel
 *    token (`deploy/nginx/saa9vi-storefront.conf`), so this returns `null` there
 *    and the platform default renders — the same as for direct/dev requests.
 *    No hostname or path sniffing is involved.
 */

async function getTenantThemeCached(channelToken: string): Promise<TenantThemeStyle | null> {
    'use cache';
    cacheLife('hours');

    const locale = await getRouteLocale();
    // Same tag shape as the other channel-scoped reads (`<thing>-<channel>-<locale>`),
    // so `/api/revalidate` can purge it via its `tenant-theme-` TAG_RULES entry.
    cacheTag(`tenant-theme-${channelToken}-${locale}`);

    // Explicit channelToken: `query()` must not read request headers inside a
    // `'use cache'` scope (see api.ts).
    const {data} = await query(GetMyTenantThemeQuery, undefined, {
        channelToken,
        languageCode: locale,
    });

    const theme = data.myTenantTheme;
    if (!theme) return null;

    return themeToCss(theme);
}

/**
 * Resolve this request's tenant theme, or null when the request is not a
 * tenant-hostname request (see the marketplace/platform note above).
 *
 * A failure here degrades to "no theme" rather than failing the request:
 * theming is presentational, so it must not be able to take down a storefront
 * page. It cannot weaken tenant isolation either — a theme only *adds* styling
 * on top of the platform defaults, while tenant identity is established at the
 * reverse proxy (B-6) and enforced by the channel-scoped data reads. The warning
 * keeps a real misconfiguration (e.g. a Redis mapping pointing at a channel
 * token that no longer exists) visible in the logs.
 */
export async function resolveTenantTheme(): Promise<TenantThemeStyle | null> {
    const channelToken = await getChannelTokenFromHeaders();
    if (!channelToken) return null;

    try {
        return await getTenantThemeCached(channelToken);
    } catch (error) {
        console.warn('[tenant-theme] theme read failed; rendering platform defaults', error);
        return null;
    }
}
