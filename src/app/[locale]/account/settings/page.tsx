import { getAuthToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRouteLocale } from '@/i18n/server';
import AccountSettingsClient from './settings-client';

export default async function AccountSettingsPage() {
    const locale = await getRouteLocale();
    const token = await getAuthToken();

    if (!token) {
        redirect(`/${locale}/sign-in`);
    }

    return <AccountSettingsClient />;
}
