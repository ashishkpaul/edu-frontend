'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AdminAccountData } from '../register-academy-client';

interface Props {
    data: AdminAccountData;
    onChange: (data: AdminAccountData) => void;
    onBack: () => void;
    onNext: () => void;
}

export default function StepAdminAccount({ data, onChange, onBack, onNext }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof AdminAccountData, string>>>({});

    const set = (field: keyof AdminAccountData, value: string) => {
        onChange({ ...data, [field]: value });
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validate = () => {
        const e: typeof errors = {};
        if (!data.firstName.trim()) e.firstName = 'First name is required.';
        if (!data.lastName.trim()) e.lastName = 'Last name is required.';
        if (!data.emailAddress.trim()) {
            e.emailAddress = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailAddress)) {
            e.emailAddress = 'Enter a valid email address.';
        }
        if (!data.password) {
            e.password = 'Password is required.';
        } else if (data.password.length < 8) {
            e.password = 'Password must be at least 8 characters.';
        }
        if (!data.confirmPassword) {
            e.confirmPassword = 'Please confirm your password.';
        } else if (data.password !== data.confirmPassword) {
            e.confirmPassword = 'Passwords do not match.';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (validate()) onNext();
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold">Create your admin account</h2>
                <p className="text-muted-foreground text-sm mt-1">
                    This account will be the owner and administrator of your academy.
                </p>
            </div>

            <div className="space-y-4">
                {/* Name row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label htmlFor="firstName" className="text-sm font-medium">
                            First name <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="firstName"
                            type="text"
                            value={data.firstName}
                            onChange={e => set('firstName', e.target.value)}
                            placeholder="Arjun"
                            autoComplete="given-name"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {errors.firstName && (
                            <p className="text-xs text-destructive">{errors.firstName}</p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="lastName" className="text-sm font-medium">
                            Last name <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="lastName"
                            type="text"
                            value={data.lastName}
                            onChange={e => set('lastName', e.target.value)}
                            placeholder="Sharma"
                            autoComplete="family-name"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        {errors.lastName && (
                            <p className="text-xs text-destructive">{errors.lastName}</p>
                        )}
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <label htmlFor="emailAddress" className="text-sm font-medium">
                        Email address <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="emailAddress"
                        type="email"
                        value={data.emailAddress}
                        onChange={e => set('emailAddress', e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors.emailAddress && (
                        <p className="text-xs text-destructive">{errors.emailAddress}</p>
                    )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-medium">
                        Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={data.password}
                            onChange={e => set('password', e.target.value)}
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirm password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                        <input
                            id="confirmPassword"
                            type={showConfirm ? 'text' : 'password'}
                            value={data.confirmPassword}
                            onChange={e => set('confirmPassword', e.target.value)}
                            placeholder="Re-enter your password"
                            autoComplete="new-password"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                            aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                    )}
                </div>
            </div>

            <div className="flex justify-between pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
