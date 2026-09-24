/**
 * Pure mapping: an ADR-043 L1 `TenantTheme` → CSS custom-property declarations.
 *
 * Deliberately dependency-free (no Next.js, no GraphQL, no env access) so it can
 * be reasoned about and executed in isolation: the frontend repo has no test
 * runner, and this is the only layer here that contains logic worth testing.
 *
 * What this module is NOT allowed to do (see `docs/adr/storefront-template-contract.md`
 * and the slice-9 constraint that the storefront renders backend state):
 *  - no entitlement/eligibility decisions — `myTenantTheme` returning null is the
 *    backend's decision, and this module is never asked to re-derive it;
 *  - no plan/usage/commercial arithmetic;
 *  - no fallback *choices* beyond "field absent ⇒ leave the platform token
 *    alone", because the platform default already lives in `globals.css`.
 *
 * The only derived value is a readable foreground for a tenant background
 * (contrast/accessibility), and every tenant-supplied string is allowlist
 * validated so it cannot terminate its declaration or inject a rule.
 */

export interface TenantThemeStyle {
    /** Sanitised `:root{...}` custom-property block, ready to inject. */
    css: string;
    /** Theme version as published by the backend — evidence/debugging. */
    version: number;
}

export interface TenantThemeFields {
    version: number;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    fontFamily?: string | null;
}

export const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
export const RGB_COLOR = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;
export const FONT_FAMILY = /^[A-Za-z0-9 ,'"-]{1,120}$/;

function safeColor(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return HEX_COLOR.test(trimmed) || RGB_COLOR.test(trimmed) ? trimmed : null;
}

function safeFontFamily(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return FONT_FAMILY.test(trimmed) ? trimmed : null;
}

/** Expand a 3/4-digit hex colour to 6 digits; null for non-hex input. */
function toSixDigitHex(color: string): string | null {
    if (!HEX_COLOR.test(color)) return null;
    const hex = color.slice(1);
    if (hex.length === 6 || hex.length === 8) return hex.slice(0, 6);
    return hex
        .split('')
        .map((char) => char + char)
        .join('');
}

/**
 * WCAG relative luminance → black or white, so a tenant's own colour cannot
 * render unreadable text. Returns null for `rgb(...)` input (non-hex), in which
 * case the platform's foreground token is left untouched.
 */
export function readableForeground(color: string): string | null {
    const hex = toSixDigitHex(color);
    if (!hex) return null;
    const channel = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16) / 255;
    const linear = (value: number) =>
        value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    const luminance =
        0.2126 * linear(channel(0)) + 0.7152 * linear(channel(2)) + 0.0722 * linear(channel(4));
    return luminance > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Map a theme onto the storefront's CSS custom properties.
 * Returns null when nothing renderable survived validation, in which case the
 * caller emits no style at all and the platform defaults apply unchanged.
 */
export function themeToCss(theme: TenantThemeFields): TenantThemeStyle | null {
    const declarations: string[] = [];

    const primary = safeColor(theme.primaryColor);
    if (primary) {
        declarations.push(`--primary: ${primary};`);
        const foreground = readableForeground(primary);
        if (foreground) declarations.push(`--primary-foreground: ${foreground};`);
    }

    const secondary = safeColor(theme.secondaryColor);
    if (secondary) {
        declarations.push(`--secondary: ${secondary};`);
        const foreground = readableForeground(secondary);
        if (foreground) declarations.push(`--secondary-foreground: ${foreground};`);
    }

    const accent = safeColor(theme.accentColor);
    if (accent) {
        declarations.push(`--accent: ${accent};`);
        const foreground = readableForeground(accent);
        if (foreground) declarations.push(`--accent-foreground: ${foreground};`);
    }

    const background = safeColor(theme.backgroundColor);
    if (background) declarations.push(`--background: ${background};`);

    // An explicit textColor wins over the contrast default derived from the
    // background, so a tenant's stated intent is never silently overridden.
    const text = safeColor(theme.textColor);
    const bodyForeground = text ?? (background ? readableForeground(background) : null);
    if (bodyForeground) declarations.push(`--foreground: ${bodyForeground};`);

    const fontFamily = safeFontFamily(theme.fontFamily);
    if (fontFamily) declarations.push(`--font-sans: ${fontFamily};`);

    if (declarations.length === 0) return null;

    return {
        css: `:root{${declarations.join('')}}`,
        version: theme.version,
    };
}
