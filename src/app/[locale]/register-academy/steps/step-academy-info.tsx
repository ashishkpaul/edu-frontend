'use client';

import { useState } from 'react';
import type { AcademyInfoData } from '../register-academy-client';

// Common IANA timezone list (abbreviated for UX)
const TIMEZONES = [
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'Australia/Sydney',
    'Pacific/Auckland',
    'UTC',
];

interface Props {
    data: AcademyInfoData;
    onChange: (data: AcademyInfoData) => void;
    onNext: () => void;
}

export default function StepAcademyInfo({ data, onChange, onNext }: Props) {
    const [errors, setErrors] = useState<Partial<Record<keyof AcademyInfoData, string>>>({});

    const set = (field: keyof AcademyInfoData, value: string) => {
        onChange({ ...data, [field]: value });
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validate = () => {
        const e: typeof errors = {};
        if (!data.businessName.trim()) e.businessName = 'Academy name is required.';
        else if (data.businessName.trim().length < 3) e.businessName = 'Must be at least 3 characters.';
        if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
            e.contactEmail = 'Enter a valid email address.';
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
                <h2 className="text-2xl font-semibold">Tell us about your academy</h2>
                <p className="text-muted-foreground text-sm mt-1">
                    This is how students will know you. You can update these details later.
                </p>
            </div>

            <div className="space-y-4">
                {/* Business name */}
                <div className="space-y-1.5">
                    <label htmlFor="businessName" className="text-sm font-medium">
                        Academy name <span className="text-destructive">*</span>
                    </label>
                    <input
                        id="businessName"
                        type="text"
                        value={data.businessName}
                        onChange={e => set('businessName', e.target.value)}
                        placeholder="e.g. Bright Minds Academy"
                        autoComplete="organization"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors.businessName && (
                        <p className="text-xs text-destructive">{errors.businessName}</p>
                    )}
                </div>

                {/* Contact email */}
                <div className="space-y-1.5">
                    <label htmlFor="contactEmail" className="text-sm font-medium">
                        Contact / support email
                        <span className="ml-1 text-muted-foreground font-normal">(optional — defaults to admin email)</span>
                    </label>
                    <input
                        id="contactEmail"
                        type="email"
                        value={data.contactEmail}
                        onChange={e => set('contactEmail', e.target.value)}
                        placeholder="support@youracademy.com"
                        autoComplete="email"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {errors.contactEmail && (
                        <p className="text-xs text-destructive">{errors.contactEmail}</p>
                    )}
                </div>

                {/* Timezone */}
                <div className="space-y-1.5">
                    <label htmlFor="timezone" className="text-sm font-medium">
                        Timezone <span className="text-destructive">*</span>
                    </label>
                    <select
                        id="timezone"
                        value={data.timezone}
                        onChange={e => set('timezone', e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        {TIMEZONES.map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                        Used to display session times to your students.
                    </p>
                </div>
            </div>

            <div className="flex justify-end pt-2">
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
