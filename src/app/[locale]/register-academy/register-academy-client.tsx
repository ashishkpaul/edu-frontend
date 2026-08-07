'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { registerAcademy } from './actions';
import StepAcademyInfo from './steps/step-academy-info';
import StepAdminAccount from './steps/step-admin-account';
import StepReview from './steps/step-review';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AcademyInfoData {
    businessName: string;
    contactEmail: string;
    timezone: string;
}

export interface AdminAccountData {
    firstName: string;
    lastName: string;
    emailAddress: string;
    password: string;
    confirmPassword: string;
}

export type Step = 'academy' | 'account' | 'review';

const STEPS: Step[] = ['academy', 'account', 'review'];

const STEP_LABELS: Record<Step, string> = {
    academy: 'Academy Info',
    account: 'Admin Account',
    review: 'Review & Launch',
};

// ─── Main wizard component ───────────────────────────────────────────────────

export default function RegisterAcademyClient() {
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState<Step>('academy');
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    const [academyInfo, setAcademyInfo] = useState<AcademyInfoData>({
        businessName: '',
        contactEmail: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    const [adminAccount, setAdminAccount] = useState<AdminAccountData>({
        firstName: '',
        lastName: '',
        emailAddress: '',
        password: '',
        confirmPassword: '',
    });

    const stepIndex = (s: Step) => STEPS.indexOf(s);
    const canAccess = (s: Step) => stepIndex(s) === 0 || completedSteps.has(STEPS[stepIndex(s) - 1]);

    const completeStep = (step: Step) => {
        setCompletedSteps(prev => new Set([...prev, step]));
        const next = STEPS[stepIndex(step) + 1];
        if (next) setCurrentStep(next);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const result = await registerAcademy({
                businessName: academyInfo.businessName,
                contactEmail: academyInfo.contactEmail || adminAccount.emailAddress,
                timezone: academyInfo.timezone,
                firstName: adminAccount.firstName,
                lastName: adminAccount.lastName,
                emailAddress: adminAccount.emailAddress,
                password: adminAccount.password,
            });

            if (result.success) {
                toast.success('Academy created! Sign in to your new dashboard.');
                router.push(`/sign-in?channelToken=${result.channelToken}&newAcademy=1`);
            } else {
                toast.error(result.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* ─── Step progress bar ───────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                    <div key={step} className="flex items-center flex-1 last:flex-none">
                        <button
                            type="button"
                            onClick={() => canAccess(step) && setCurrentStep(step)}
                            className="flex flex-col items-center gap-1.5 group"
                            disabled={!canAccess(step)}
                        >
                            <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all duration-200 ${
                                completedSteps.has(step)
                                    ? 'bg-primary text-primary-foreground'
                                    : currentStep === step
                                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                {completedSteps.has(step) ? <Check className="h-4 w-4" /> : index + 1}
                            </div>
                            <span className={`text-xs font-medium whitespace-nowrap ${
                                completedSteps.has(step) || currentStep === step
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                            }`}>
                                {STEP_LABELS[step]}
                            </span>
                        </button>
                        {index < STEPS.length - 1 && (
                            <div className="flex-1 mx-3 mb-5">
                                <div className={`h-0.5 transition-colors duration-300 ${
                                    completedSteps.has(step) ? 'bg-primary' : 'bg-muted'
                                }`} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ─── Step panels ─────────────────────────────────────────────── */}
            <div className="rounded-xl border bg-card p-8 shadow-sm">
                {currentStep === 'academy' && (
                    <StepAcademyInfo
                        data={academyInfo}
                        onChange={setAcademyInfo}
                        onNext={() => completeStep('academy')}
                    />
                )}
                {currentStep === 'account' && (
                    <StepAdminAccount
                        data={adminAccount}
                        onChange={setAdminAccount}
                        onBack={() => setCurrentStep('academy')}
                        onNext={() => completeStep('account')}
                    />
                )}
                {currentStep === 'review' && (
                    <StepReview
                        academyInfo={academyInfo}
                        adminAccount={adminAccount}
                        onBack={() => setCurrentStep('account')}
                        onSubmit={handleSubmit}
                        submitting={submitting}
                    />
                )}
            </div>
        </div>
    );
}
