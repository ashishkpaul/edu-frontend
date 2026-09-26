'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
    requestMySubscriptionPlanChangeAction,
    cancelMySubscriptionAction,
} from './actions';

interface BillingPlan {
    id: string;
    name: string;
    monthlyPriceInPaise: number;
}

interface BillingSubscription {
    plan: { id: string; name: string };
    status: string;
    cancelAtPeriodEnd: boolean;
}

interface BillingActionsProps {
    plans: BillingPlan[];
    subscription: BillingSubscription | null;
}

export default function BillingActions({ plans, subscription }: BillingActionsProps) {
    const t = useTranslations('Billing');
    const router = useRouter();
    const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    const handlePlanChange = async (planId: string) => {
        setBusyPlanId(planId);
        try {
            const result = await requestMySubscriptionPlanChangeAction(planId);
            if (!result.success) {
                toast.error(result.error);
                return;
            }

            if (result.authorizationUrl) {
                window.location.assign(result.authorizationUrl);
                return;
            }

            toast.success(t('changeRequested'));
            router.refresh();
        } finally {
            setBusyPlanId(null);
        }
    };

    const handleCancel = async (atPeriodEnd: boolean) => {
        const message = atPeriodEnd
            ? t('cancelAtPeriodEndConfirm')
            : t('cancelImmediatelyConfirm');

        if (!window.confirm(message)) return;

        setCancelling(true);
        try {
            const result = await cancelMySubscriptionAction(atPeriodEnd);
            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success(
                atPeriodEnd ? t('cancellationScheduled') : t('cancelled'),
            );
            router.refresh();
        } finally {
            setCancelling(false);
        }
    };

    if (!subscription) return null;

    const canChange =
        subscription.status !== 'cancelled' &&
        subscription.status !== 'pending_provider_auth';

    return (
        <div className="space-y-3">
            {canChange && (
                <div className="flex flex-wrap gap-2">
                    {plans
                        .filter((plan) => plan.id !== subscription.plan.id)
                        .map((plan) => (
                            <button
                                key={plan.id}
                                type="button"
                                disabled={busyPlanId !== null || cancelling}
                                onClick={() => handlePlanChange(plan.id)}
                                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {busyPlanId === plan.id
                                    ? t('changingPlan')
                                    : t('changeToPlan', { name: plan.name })}
                            </button>
                        ))}
                </div>
            )}

            {subscription.status !== 'cancelled' && !subscription.cancelAtPeriodEnd && (
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={cancelling || busyPlanId !== null}
                        onClick={() => handleCancel(true)}
                        className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {cancelling ? t('cancelling') : t('cancelAtPeriodEnd')}
                    </button>
                    <button
                        type="button"
                        disabled={cancelling || busyPlanId !== null}
                        onClick={() => handleCancel(false)}
                        className="rounded-md border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {cancelling ? t('cancelling') : t('cancelImmediately')}
                    </button>
                </div>
            )}

            {subscription.cancelAtPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                    {t('cancellationPending')}
                </p>
            )}
        </div>
    );
}
