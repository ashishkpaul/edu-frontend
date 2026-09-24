import {query} from '@/lib/vendure/api';
import {GetAvailableSubscriptionPlansQuery, GetMySubscriptionDashboardQuery} from '@/lib/vendure/queries';
import {getRouteLocale} from '@/i18n/server';
import {getAuthToken} from '@/lib/auth';
import {redirect} from 'next/navigation';
import {getTranslations} from 'next-intl/server';
import {Check} from 'lucide-react';

// ─── Display-only shapes: explicit projections of the slice-8 §3.5 contract ──

interface PlanCard {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    monthlyPriceInPaise: number;
    includedBbbMinutes: number;
    maxStudents: number;
    customDomainEnabled: boolean;
    whitelabelEnabled: boolean;
    marketplaceListingEnabled: boolean;
}

interface BillingSubscription {
    plan: {id: string; name: string};
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    cancelledAt: string | null;
    marketplaceEligible: boolean;
}

interface BillingUsage {
    periodStart: string | null;
    periodEnd: string | null;
    includedMinutes: number;
    consumedMinutes: number;
    remainingMinutes: number | null;
    isUnbounded: boolean;
}

// ─── Presentational formatting — never a commercial decision ────────────────

function formatMoney(paise: number, locale: string): string {
    return new Intl.NumberFormat(locale, {style: 'currency', currency: 'INR'}).format(paise / 100);
}

function formatDate(iso: string | null, locale: string): string | null {
    if (!iso) return null;
    return new Intl.DateTimeFormat(locale, {dateStyle: 'medium'}).format(new Date(iso));
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function BillingPage() {
    const locale = await getRouteLocale();
    const token = await getAuthToken();

    if (!token) {
        redirect(`/${locale}/sign-in`);
    }

    const t = await getTranslations('Billing');

    // Plan catalogue — Permission.Public on the backend; channel context still
    // comes from the proxy header, so the read stays tenant-scoped like every
    // other request (ADR-043: no hostname/path sniffing anywhere).
    const {data: catalogueData} = await query(GetAvailableSubscriptionPlansQuery, undefined, {
        languageCode: locale,
    });
    const plans = catalogueData.availableSubscriptionPlans as PlanCard[];

    // Business-account panels — Permission.Authenticated + the backend's
    // ownership check. A learner session is refused (ForbiddenError) and a
    // stale session fails authentication; neither may take the page down, and
    // the storefront never re-derives WHICH reason applies — it only reports
    // that the panel is unavailable.
    let panels: {subscription: BillingSubscription | null; usage: BillingUsage} | null = null;
    try {
        const {data} = await query(GetMySubscriptionDashboardQuery, undefined, {
            useAuthToken: true,
            languageCode: locale,
        });
        panels = {
            subscription: (data.mySubscription ?? null) as BillingSubscription | null,
            usage: data.myLiveUsage as BillingUsage,
        };
    } catch (err) {
        console.warn(
            '[billing] mySubscription/myLiveUsage read failed:',
            err instanceof Error ? err.message : err,
        );
    }

    const statusLabels: Record<string, string> = {
        pending_provider_auth: t('statusPendingProviderAuth'),
        trialing: t('statusTrialing'),
        active: t('statusActive'),
        past_due: t('statusPastDue'),
        cancelled: t('statusCancelled'),
    };

    const subscription = panels?.subscription ?? null;
    const usage = panels?.usage ?? null;
    return (
        <div className="space-y-10">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <p className="text-muted-foreground">{t('subtitle')}</p>
            </header>

            <section className="space-y-4" aria-labelledby="billing-current">
                <h2 id="billing-current" className="text-xl font-semibold">
                    {t('myPlanHeading')}
                </h2>
                {panels === null ? (
                    <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                        {t('panelsUnavailable')}
                    </div>
                ) : subscription === null ? (
                    <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                        {t('noSubscription')}
                    </div>
                ) : (
                    <div className="space-y-4 rounded-md border border-border p-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-semibold">{subscription.plan.name}</h3>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                {statusLabels[subscription.status] ?? subscription.status}
                            </span>
                            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                                {subscription.marketplaceEligible
                                    ? t('marketplaceListed')
                                    : t('marketplaceNotListed')}
                            </span>
                        </div>

                        {subscription.currentPeriodStart || subscription.currentPeriodEnd ? (
                            <p className="text-sm text-muted-foreground">
                                {t('period')}:{' '}
                                {formatDate(subscription.currentPeriodStart, locale) ?? '—'} –{' '}
                                {formatDate(subscription.currentPeriodEnd, locale) ?? '—'}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">{t('periodNone')}</p>
                        )}

                        {subscription.cancelAtPeriodEnd && (
                            <p className="text-sm font-medium text-destructive">
                                {t('cancelsAtPeriodEnd')}
                            </p>
                        )}
                        {subscription.cancelledAt && (
                            <p className="text-sm text-muted-foreground">
                                {t('cancelledOn', {
                                    date:
                                        formatDate(subscription.cancelledAt, locale) ??
                                        subscription.cancelledAt,
                                })}
                            </p>
                        )}
                    </div>
                )}

                {/* Rendered independently of the subscription row above: the
                    channel's live allowance comes from BbbCapacityGrant rows
                    (e.g. order-based grants), so it can be non-zero even when
                    mySubscription is null. */}
                {usage && (
                    <div className="space-y-3 rounded-md border border-border p-6">
                        <h4 className="font-medium">{t('usageHeading')}</h4>
                        {usage.isUnbounded ? (
                            <p className="text-sm text-muted-foreground">
                                {t('usageUnlimited')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {(usage.periodStart || usage.periodEnd) && (
                                    <p className="text-sm text-muted-foreground">
                                        {t('usagePeriod', {
                                            start: formatDate(usage.periodStart, locale) ?? '—',
                                            end: formatDate(usage.periodEnd, locale) ?? '—',
                                        })}
                                    </p>
                                )}
                                <dl className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <dt className="text-muted-foreground">
                                            {t('usageIncluded')}
                                        </dt>
                                        <dd className="text-lg font-semibold">
                                            {usage.includedMinutes}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">
                                            {t('usageConsumed')}
                                        </dt>
                                        <dd className="text-lg font-semibold">
                                            {usage.consumedMinutes}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">
                                            {t('usageRemaining')}
                                        </dt>
                                        <dd className="text-lg font-semibold">
                                            {usage.remainingMinutes ?? 0}
                                        </dd>
                                    </div>
                                </dl>
                                {usage.includedMinutes > 0 && (
                                    <div
                                        className="h-2 w-full overflow-hidden rounded-full bg-muted"
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuemax={usage.includedMinutes}
                                        aria-valuenow={usage.consumedMinutes}
                                    >
                                        <div
                                            className="h-2 rounded-full bg-primary"
                                            style={{
                                                width: `${Math.min(100, Math.round((usage.consumedMinutes / usage.includedMinutes) * 100))}%`,
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>
            <section className="space-y-4" aria-labelledby="billing-plans">
                <div className="space-y-1">
                    <h2 id="billing-plans" className="text-xl font-semibold">
                        {t('plansHeading')}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t('plansIntro')}</p>
                </div>

                {plans.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noPlans')}</p>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {plans.map((plan) => {
                            const isCurrent = subscription?.plan.id === plan.id;
                            return (
                                <li
                                    key={plan.id}
                                    className={`flex flex-col gap-3 rounded-md border p-5 ${
                                        isCurrent
                                            ? 'border-primary ring-1 ring-primary'
                                            : 'border-border'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold">{plan.name}</h3>
                                        {isCurrent && (
                                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                                {t('currentPlan')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-2xl font-bold">
                                        {formatMoney(plan.monthlyPriceInPaise, locale)}
                                        <span className="text-sm font-normal text-muted-foreground">
                                            {' '}
                                            {t('perMonth')}
                                        </span>
                                    </p>
                                    {plan.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {plan.description}
                                        </p>
                                    )}
                                    <ul className="space-y-1 text-sm">
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 shrink-0 text-primary" />
                                            {t('bbbMinutes', {minutes: plan.includedBbbMinutes})}
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-4 w-4 shrink-0 text-primary" />
                                            {t('maxStudents', {count: plan.maxStudents})}
                                        </li>
                                        {plan.customDomainEnabled && (
                                            <li className="flex items-center gap-2">
                                                <Check className="h-4 w-4 shrink-0 text-primary" />
                                                {t('customDomain')}
                                            </li>
                                        )}
                                        {plan.whitelabelEnabled && (
                                            <li className="flex items-center gap-2">
                                                <Check className="h-4 w-4 shrink-0 text-primary" />
                                                {t('whitelabel')}
                                            </li>
                                        )}
                                        {plan.marketplaceListingEnabled && (
                                            <li className="flex items-center gap-2">
                                                <Check className="h-4 w-4 shrink-0 text-primary" />
                                                {t('marketplaceListing')}
                                            </li>
                                        )}
                                    </ul>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}