'use server';

import {mutate} from '@/lib/vendure/api';
import {LoginMutation, LogoutMutation, AdminSessionLoginMutation} from '@/lib/vendure/mutations';
import {removeAuthToken, setAuthToken} from '@/lib/auth';
import {redirect} from '@/i18n/navigation';
import {revalidatePath} from "next/cache";
import {getLocale, getTranslations} from 'next-intl/server';

export async function loginAction(prevState: { error?: string } | undefined, formData: FormData) {
    const t = await getTranslations('Errors');
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const redirectTo = formData.get('redirectTo') as string | null;

    const result = await mutate(LoginMutation, {
        username,
        password,
    }, { useAuthToken: true });

    const loginResult = result.data.login;

    if (loginResult.__typename !== 'CurrentUser') {
        if (loginResult.__typename === 'NotVerifiedError') {
            return { error: t('verifyEmailFirst') };
        }

        // Business-account bridge (slice 8 platform finding): the Shop API
        // resolves login through the `customer` table, so a tenant
        // administrator always lands here with INVALID_CREDENTIALS_ERROR.
        // Retry once against the Admin API (VENDURE_ADMIN_API_URL); the session
        // it issues is accepted by Shop reads, which is how the billing
        // dashboard gets its business-account session. Never throws — and note
        // redirect() must stay OUTSIDE this try block, since it signals via an
        // exception that would otherwise be swallowed.
        if (loginResult.errorCode === 'INVALID_CREDENTIALS_ERROR') {
            const adminApiUrl = process.env.VENDURE_ADMIN_API_URL;
            if (adminApiUrl) {
                let adminToken: string | undefined;
                let outcome: string;
                try {
                    const admin = await mutate(AdminSessionLoginMutation, { username, password }, { url: adminApiUrl });
                    if (admin.data.login.__typename === 'CurrentUser') {
                        adminToken = admin.token;
                        outcome = adminToken ? 'ok' : 'CurrentUser but no session header';
                    } else {
                        outcome = `typename=${admin.data.login.__typename}`;
                    }
                } catch (err) {
                    outcome = `threw: ${err instanceof Error ? err.message : String(err)}`;
                }
                if (!adminToken) {
                    console.warn(`[sign-in] admin bridge not used (url=${adminApiUrl}): ${outcome}`);
                } else {
                    await setAuthToken(adminToken);
                    const locale = await getLocale();
                    revalidatePath(`/${locale}`, 'layout');
                    const safeRedirect = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
                        ? redirectTo
                        : '/';
                    redirect({href: safeRedirect, locale});
                }
            } else {
                console.warn('[sign-in] admin bridge disabled: VENDURE_ADMIN_API_URL unset');
            }
        }

        return { error: t('invalidCredentials') };
    }

    // Store the token in a cookie if returned
    if (result.token) {
        await setAuthToken(result.token);
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}`, 'layout');

    // Validate redirectTo is a safe internal path
    const safeRedirect = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo
        : '/';

    redirect({href: safeRedirect, locale});

}

export async function logoutAction() {
    await mutate(LogoutMutation);
    await removeAuthToken();

    const locale = await getLocale();
    redirect({href: '/', locale})
}
