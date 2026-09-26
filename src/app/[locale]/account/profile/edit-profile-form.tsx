'use client';

import { useActionState, useEffect, useState } from 'react';
import { updateCustomerAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface EditProfileFormProps {
    customer: {
        firstName: string;
        lastName: string;
    } | null;
}

export function EditProfileForm({ customer }: EditProfileFormProps) {
    const t = useTranslations('Account');
    const [firstName, setFirstName] = useState(customer?.firstName ?? '');
    const [lastName, setLastName] = useState(customer?.lastName ?? '');
    const [state, formAction, isPending] = useActionState(updateCustomerAction, undefined);

    useEffect(() => {
        setFirstName(customer?.firstName ?? '');
        setLastName(customer?.lastName ?? '');
    }, [customer?.firstName, customer?.lastName]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('personalInformation')}</CardTitle>
                <CardDescription>
                    {t('updatePersonalDetails')}
                </CardDescription>
            </CardHeader>
            <form id="edit-profile-form" action={formAction}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">{t('firstName')}</Label>
                        <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            placeholder="John"
                            value={firstName}
                            onValueChange={setFirstName}
                            required
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">{t('lastName')}</Label>
                        <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            placeholder="Doe"
                            value={lastName}
                            onValueChange={setLastName}
                            required
                            disabled={isPending}
                        />
                    </div>
                    {state?.error && (
                        <div className="text-sm text-destructive">
                            {state.error}
                        </div>
                    )}
                    {state?.success && (
                        <div className="text-sm text-green-600">
                            {t('profileUpdated')}
                        </div>
                    )}
                    <Button type="submit" disabled={isPending}>
                        {isPending ? t('updating') : t('updateProfile')}
                    </Button>
                </CardContent>
            </form>
        </Card>
    );
}
