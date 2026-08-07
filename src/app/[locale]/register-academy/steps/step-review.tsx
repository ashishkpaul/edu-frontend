'use client';

import { Loader2, Rocket } from 'lucide-react';
import type { AcademyInfoData, AdminAccountData } from '../register-academy-client';

interface Props {
    academyInfo: AcademyInfoData;
    adminAccount: AdminAccountData;
    onBack: () => void;
    onSubmit: () => void;
    submitting: boolean;
}

export default function StepReview({ academyInfo, adminAccount, onBack, onSubmit, submitting }: Props) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold">Review & launch</h2>
                <p className="text-muted-foreground text-sm mt-1">
                    Confirm the details below. Your academy will be created and you'll be able to sign in to your dashboard.
                </p>
            </div>

            {/* Academy summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Academy
                </h3>
                <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Name</dt>
                        <dd className="font-medium text-right">{academyInfo.businessName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Contact email</dt>
                        <dd className="font-medium text-right">
                            {academyInfo.contactEmail || adminAccount.emailAddress}
                        </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Timezone</dt>
                        <dd className="font-medium text-right">{academyInfo.timezone}</dd>
                    </div>
                </dl>
            </div>

            {/* Admin summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Administrator
                </h3>
                <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Name</dt>
                        <dd className="font-medium text-right">
                            {adminAccount.firstName} {adminAccount.lastName}
                        </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Email</dt>
                        <dd className="font-medium text-right">{adminAccount.emailAddress}</dd>
                    </div>
                </dl>
            </div>

            <div className="flex justify-between pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating academy...
                        </>
                    ) : (
                        <>
                            <Rocket className="h-4 w-4" />
                            Launch academy
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
