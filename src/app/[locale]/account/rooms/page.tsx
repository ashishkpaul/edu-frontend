import { query } from '@/lib/vendure/api';
import { GetActiveCustomerQuery } from '@/lib/vendure/queries';
import { getRouteLocale } from '@/i18n/server';
import { getAuthToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getRoomsAction } from './actions';
import RoomsClient from './rooms-client';

// ─── Classrooms ─────────────────────────────────────────────────────────────
// The room screen the storefront never had: `bbbRoomStatus` / `bbbJoinRoom`
// were defined as documents but wired to nothing.
//
// Everything actionable is server-driven (INV-008 / INV-027): the backend
// derives `classAction` (START | JOIN | WAIT | NONE) from the same access
// evaluation `joinRoom` uses, and this page only renders it. No role, clock or
// room-state logic is re-derived here.

export default async function RoomsPage() {
    const locale = await getRouteLocale();
    const token = await getAuthToken();

    if (!token) {
        redirect(`/${locale}/sign-in`);
    }

    const [{ rooms }, customer] = await Promise.all([
        getRoomsAction(),
        query(GetActiveCustomerQuery, undefined, {
            useAuthToken: true,
            languageCode: locale,
        }).catch(() => ({ data: { activeCustomer: null } })),
    ]);

    const activeCustomer = customer.data.activeCustomer as
        | { firstName?: string | null; lastName?: string | null }
        | null;
    const participantName =
        [activeCustomer?.firstName, activeCustomer?.lastName].filter(Boolean).join(' ') ||
        'Student';

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-2">Classrooms</h1>
            <p className="text-muted-foreground mb-8">
                Start a class if you teach it, or join one that is already running.
            </p>

            {rooms === null ? (
                <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    We could not load your classrooms. Please refresh the page.
                </p>
            ) : rooms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <p>You do not have access to any classrooms yet.</p>
                    <Link
                        href={`/${locale}/search`}
                        className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Browse courses
                    </Link>
                </div>
            ) : (
                <RoomsClient initialRooms={rooms} participantName={participantName} />
            )}
        </div>
    );
}
