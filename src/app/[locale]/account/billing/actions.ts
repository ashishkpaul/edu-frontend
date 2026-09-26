'use server';

import { revalidatePath } from 'next/cache';
import { getRouteLocale } from '@/i18n/server';
import { mutate } from '@/lib/vendure/api';
import {
    RequestMySubscriptionPlanChangeMutation,
    CancelMySubscriptionMutation,
} from '@/lib/vendure/mutations';

export async function requestMySubscriptionPlanChangeAction(planId: string) {
    try {
        const result = await mutate(
            RequestMySubscriptionPlanChangeMutation,
            { planId },
            { useAuthToken: true },
        );

        const operation = result.data.requestMySubscriptionPlanChange;
        const locale = await getRouteLocale();
        revalidatePath(`/${locale}/account/billing`);

        return {
            success: true as const,
            authorizationUrl: operation.authorizationUrl ?? null,
            subscription: operation.subscription,
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : 'Unable to change the subscription right now.',
        };
    }
}

export async function cancelMySubscriptionAction(atPeriodEnd: boolean) {
    try {
        const result = await mutate(
            CancelMySubscriptionMutation,
            { atPeriodEnd },
            { useAuthToken: true },
        );

        const operation = result.data.cancelMySubscription;
        const locale = await getRouteLocale();
        revalidatePath(`/${locale}/account/billing`);

        return {
            success: true as const,
            subscription: operation.subscription,
        };
    } catch (error) {
        return {
            success: false as const,
            error:
                error instanceof Error
                    ? error.message
                    : 'Unable to cancel the subscription right now.',
        };
    }
}
