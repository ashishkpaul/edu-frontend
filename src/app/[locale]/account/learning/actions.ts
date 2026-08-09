'use server';

import { query } from '@/lib/vendure/api';
import { getAuthToken } from '@/lib/auth';
import { GetMyLearningDashboardQuery } from '@/lib/vendure/queries';

/**
 * Server action: re-fetch the learning dashboard.
 *
 * Used by the client polling loop so that when a session transitions to LIVE
 * (and the backend provisions an active meeting), the page acquires a fresh
 * canJoin/joinUrl without a manual refresh. Eligibility is decided entirely
 * server-side (INV-008) — this action only relays the server-provided contract.
 */
export async function getLearningDashboardAction() {
    const token = await getAuthToken();
    if (!token) {
        return { courses: [] };
    }

    try {
        const { data } = await query(
            GetMyLearningDashboardQuery,
            undefined,
            { useAuthToken: true },
        );
        return { courses: data.myLearningDashboard?.courses ?? [] };
    } catch {
        // Non-fatal — keep showing whatever the client already has.
        return { courses: null };
    }
}
