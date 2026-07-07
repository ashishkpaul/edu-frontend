/**
 * Session CTA helper — INV-008 isolation layer.
 *
 * TODO(ADR-013 INV-006/INV-008): Delete this file and inline
 * access.ctaAction/ctaLabel once courseAccess(courseId) ships server-side.
 *
 * Every component that needs "what button do I show" imports this one function.
 * When courseAccess(courseId) ships, you delete this file and swap in the real
 * field — one diff, not a scavenger hunt through components.
 */

export type CtaAction = 'join' | 'trial' | 'checkout' | 'none';

export interface SessionCta {
    label: string;
    action: CtaAction;
}

interface MyScheduledSession {
    joinUrl: string | null;
    status: string;
}

interface PublicSession {
    isTrial: boolean;
    joinUrl: string | null;
}

interface TrialRegistration {
    status: string;
}

/**
 * Determine the CTA for a session based on its current state.
 *
 * - If the session has a joinUrl, the student can join now.
 * - If the session is a trial and the student hasn't registered, offer trial.
 * - If the student has already registered for a trial, show "registered" state.
 * - Otherwise, prompt to enroll/purchase.
 */
export function getSessionCta(
    session: MyScheduledSession | PublicSession,
    trial?: TrialRegistration,
): SessionCta {
    if (session.joinUrl) {
        return { label: 'Join class', action: 'join' as const };
    }

    if ('isTrial' in session && session.isTrial && !trial) {
        return { label: 'Start free trial', action: 'trial' as const };
    }

    if (trial?.status === 'REGISTERED') {
        return { label: 'Registered — see you there', action: 'none' as const };
    }

    return { label: 'Enroll now', action: 'checkout' as const };
}
