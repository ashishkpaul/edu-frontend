'use server';

import { mutate } from '@/lib/vendure/api';
import { setAuthToken } from '@/lib/auth';
import { RegisterNewTenantMutation } from '@/lib/vendure/mutations';

export interface RegisterAcademyInput {
    businessName: string;
    contactEmail?: string;
    timezone: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    password: string;
}

export async function registerAcademy(input: RegisterAcademyInput) {
    try {
        const result = await mutate(RegisterNewTenantMutation, {
            input: {
                businessName: input.businessName,
                contactEmail: input.contactEmail || input.emailAddress,
                timezone: input.timezone,
                firstName: input.firstName,
                lastName: input.lastName,
                emailAddress: input.emailAddress,
                password: input.password,
            },
        });

        const { channelToken } = result.data.registerNewTenant;

        // Store the auth token if the server issued one
        if (result.token) {
            await setAuthToken(result.token);
        }

        return { success: true as const, channelToken };
    } catch (err) {
        return {
            success: false as const,
            error: err instanceof Error ? err.message : 'Registration failed. Please try again.',
        };
    }
}
