import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

// next-intl handles locale routing internally via the plugin in next.config.ts.
// Channel token resolution is handled via headers in api.ts.
// For local dev, the VENDURE_CHANNEL_TOKEN env var serves as the fallback — no Redis lookup needed.

export default createMiddleware(routing);

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|assets|images|icons).*)',
    ],
};
