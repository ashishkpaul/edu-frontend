import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

// next-intl handles locale routing internally via the plugin in next.config.ts.
// Channel token resolution:
//   - Custom domains → set by reverse proxy (nginx/Cloudflare) as x-saa9vi-channel-token header
//   - Local dev → VENDURE_CHANNEL_TOKEN env var (fallback in api.ts)
//
// Full hostname→channel Redis resolution is handled by:
//   - GET /api/resolve-channel?hostname=... (Route Handler, Node.js runtime)
//   - Called from nginx/Cloudflare Worker in production
//   - NOT from Edge middleware (Edge runtime can't use ioredis)
export default createMiddleware(routing);

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|assets|images|icons|.*\\.svg).*)',
    ],
};
