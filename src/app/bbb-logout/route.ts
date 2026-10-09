import { NextRequest, NextResponse } from 'next/server';
import { mutate } from '@/lib/vendure/api';
import { LogoutMutation } from '@/lib/vendure/mutations';

const AUTH_TOKEN_COOKIE = process.env.VENDURE_AUTH_TOKEN_COOKIE || 'vendure-auth-token';

/**
 * GET /bbb-logout — where BigBlueButton redirects when a class ends.
 *
 * BBB's `logoutURL` is built server-side as `${STOREFRONT_URL}/bbb-logout`
 * (no locale segment), so this route lives at the app ROOT and is excluded
 * from the next-intl middleware matcher: a locale redirect here would land on
 * a `[locale]/bbb-logout` route that does not exist, i.e. a 404 at the exact
 * moment a learner finishes a class.
 *
 * Order matters:
 *  1. best-effort server-side logout, so the Vendure session is invalidated;
 *  2. ALWAYS clear the local auth cookie — a failure in (1) must never leave
 *     the browser half-logged-in;
 *  3. redirect to `/`, where the middleware applies the right locale.
 *
 * Cookie mutation is legal here (Route Handler) but not in a Server
 * Component, which is why this is a route and not a page.
 */
export async function GET(request: NextRequest) {
    const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

    if (token) {
        try {
            await mutate(LogoutMutation, undefined, { token });
        } catch {
            // Best-effort: the cookie is cleared either way.
        }
    }

    const response = NextResponse.redirect(new URL('/', request.url), 303);
    response.cookies.delete(AUTH_TOKEN_COOKIE);
    return response;
}
