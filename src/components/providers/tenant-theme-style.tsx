import {resolveTenantTheme} from '@/lib/vendure/tenant-theme';

/**
 * Renders the ADR-043 L1 tenant theme as a sanitised `:root{...}` style block.
 *
 * Nothing is emitted when the backend returns no theme (ineligible channel, or
 * a request that carries no proxy-resolved tenant token — e.g. the marketplace
 * surface), which is what leaves the platform defaults in `globals.css` in
 * force. The CSS string is built only from allowlist-validated values in
 * `lib/vendure/tenant-theme.ts`; this component does no theme logic itself.
 *
 * The `data-` attributes exist so the applied theme is verifiable from the
 * rendered HTML (tenant A vs tenant B vs platform default).
 */
export async function TenantThemeStyle() {
    const theme = await resolveTenantTheme();

    if (!theme) return null;

    return (
        <style
            id="saa9vi-tenant-theme"
            data-tenant-theme-version={theme.version}
            dangerouslySetInnerHTML={{__html: theme.css}}
        />
    );
}
