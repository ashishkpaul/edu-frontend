import type {TadaDocumentNode} from 'gql.tada';
import {print} from 'graphql';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;
const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';
const VENDURE_AUTH_TOKEN_HEADER = process.env.VENDURE_AUTH_TOKEN_HEADER || 'vendure-auth-token';
const VENDURE_CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';
const SAA9VI_CHANNEL_TOKEN_HEADER = 'x-saa9vi-channel-token';

if (!VENDURE_API_URL) {
    throw new Error('VENDURE_SHOP_API_URL or NEXT_PUBLIC_VENDURE_SHOP_API_URL environment variable is not set');
}

interface VendureRequestOptions {
    token?: string;
    useAuthToken?: boolean;
    channelToken?: string;
    languageCode?: string;
    currencyCode?: string;
    fetch?: RequestInit;
    tags?: string[];
}

interface VendureResponse<T> {
    data?: T;
    errors?: Array<{ message: string; [key: string]: unknown }>;
}

/**
 * Extract the Vendure auth token from response headers
 */
function extractAuthToken(headers: Headers): string | null {
    return headers.get(VENDURE_AUTH_TOKEN_HEADER);
}

/**
 * Read the channel token from the x-saa9vi-channel-token header.
 * In production, this header is set by the reverse proxy (nginx/Cloudflare)
 * after resolving the hostname via GET /api/resolve-channel.
 * Uses next/headers() which is only available in Server Components and Route Handlers.
 * Falls back to null if called outside a request context (e.g., build time).
 *
 * Export this for use in page-level channel resolution before calling cached functions.
 * The cached functions themselves must NOT call this (next/headers() is forbidden
 * inside 'use cache' scopes).
 */
export async function getChannelTokenFromHeaders(): Promise<string | null> {
    try {
        const { headers } = await import('next/headers');
        const h = await headers();
        return h.get(SAA9VI_CHANNEL_TOKEN_HEADER);
    } catch {
        // next/headers() throws if called outside a request context
        return null;
    }
}

/**
 * Execute a GraphQL query against the Vendure API
 */
export async function query<TResult, TVariables>(
    document: TadaDocumentNode<TResult, TVariables>,
    ...[variables, options]: TVariables extends Record<string, never>
        ? [variables?: TVariables, options?: VendureRequestOptions]
        : [variables: TVariables, options?: VendureRequestOptions]
): Promise<{ data: TResult; token?: string }> {
    const {
        token,
        useAuthToken,
        channelToken,
        languageCode,
        currencyCode,
        fetch: fetchOptions,
        tags,
    } = options || {};

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions?.headers as Record<string, string>),
    };

    // Use the explicitly provided token, or fetch from cookies if useAuthToken is true.
    // getAuthToken is dynamically imported so client components that import this
    // module don't pull in next/headers (server-only) into the client bundle.
    let authToken = token;
    if (useAuthToken && !authToken) {
        const {getAuthToken} = await import('@/lib/auth');
        authToken = await getAuthToken();
    }

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Resolve channel token with this priority:
    // 1. Explicitly provided channelToken option (bypasses header check - safe for cached functions)
    // 2. x-saa9vi-channel-token header set by the reverse proxy (custom-domain academies)
    // 3. VENDURE_CHANNEL_TOKEN env var (local dev / preview deployments)
    //
    // Special case: channelToken === '' means "no channel token" (used by queryPublic
    // for cross-tenant queries like marketplace search). Skip the header entirely.
    //
    // Header states, and the B-6 fail-closed guarantee:
    //   - token   → use it (the proxy resolved this hostname to a tenant).
    //   - ''      → "no tenant resolved": Caddy's copy_headers preserves an
    //               empty value; the env-var fallback below is intended.
    //   - null    → no header at all: direct/dev requests, the marketplace
    //               vhost (deliberately header-free), or a proxied request for
    //               a hostname with no tenant — nginx drops the proxy's
    //               empty-valued header, making that case indistinguishable
    //               from "no proxy" by the time it arrives here. Also falls
    //               back to the env var.
    // Both '' and null therefore mean "no tenant resolved → env fallback", and
    // that stays safe because the only requests where the fallback would be
    // wrong — an unmapped tenant hostname — never get this far: the reverse
    // proxy denies them with a 403 at the edge. See
    // src/app/api/resolve-channel/route.ts (contract block) and deploy/*.
    // Do not "fix" this by throwing on '' — under nginx that value never
    // arrives, so the throw would be dead code while the leak it targets
    // stayed open.
    const headerChannelToken = channelToken ?? (await getChannelTokenFromHeaders());
    if (channelToken === '') {
        // queryPublic — skip channel token header for cross-tenant queries
    } else {
        const resolvedChannelToken = headerChannelToken || VENDURE_CHANNEL_TOKEN;
        headers[VENDURE_CHANNEL_TOKEN_HEADER] = resolvedChannelToken;
    }

    const url = new URL(VENDURE_API_URL!);
    if (languageCode) {
        url.searchParams.set('languageCode', languageCode);
    }
    if (currencyCode) {
        url.searchParams.set('currencyCode', currencyCode);
    }

    const response = await fetch(url.toString(), {
        ...fetchOptions,
        method: 'POST',
        headers,
        body: JSON.stringify({
            query: print(document),
            variables: variables || {},
        }),
        ...(tags && {next: {tags}}),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: VendureResponse<TResult> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map(e => e.message).join(', '));
    }

    if (!result.data) {
        throw new Error('No data returned from Vendure API');
    }

    const newToken = extractAuthToken(response.headers);

    return {
        data: result.data,
        ...(newToken && {token: newToken}),
    };
}

/**
 * Execute a GraphQL query WITHOUT sending a channel token header.
 * Used for cross-tenant queries like marketplace search where the
 * channel token would leak tenant context into a tenant-agnostic query.
 */
export async function queryPublic<TResult, TVariables>(
    document: TadaDocumentNode<TResult, TVariables>,
    ...[variables, options]: TVariables extends Record<string, never>
        ? [variables?: TVariables, options?: VendureRequestOptions]
        : [variables: TVariables, options?: VendureRequestOptions]
): Promise<{ data: TResult; token?: string }> {
    // @ts-expect-error - Complex conditional type inference, runtime behavior is correct
    return query(document, variables, {...options, channelToken: ''});
}

/**
 * Execute a GraphQL mutation against the Vendure API
 */
export async function mutate<TResult, TVariables>(
    document: TadaDocumentNode<TResult, TVariables>,
    ...[variables, options]: TVariables extends Record<string, never>
        ? [variables?: TVariables, options?: VendureRequestOptions]
        : [variables: TVariables, options?: VendureRequestOptions]
): Promise<{ data: TResult; token?: string }> {
    // Mutations use the same underlying implementation as queries in GraphQL
    // @ts-expect-error - Complex conditional type inference, runtime behavior is correct
    return query(document, variables, options);
}
