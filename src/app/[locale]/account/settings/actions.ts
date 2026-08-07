'use server';

import { removeAuthToken } from '@/lib/auth';
import { mutate } from '@/lib/vendure/api';
import { LogoutMutation, LeaveAcademyMutation, DeleteMyAccountMutation } from '@/lib/vendure/mutations';

/**
 * Server action: call the Vendure logout mutation and clear the auth cookie.
 * Used by the account settings page after LeaveAcademy / DeleteMyAccount.
 */
export async function signOutAction(): Promise<void> {
    try {
        await mutate(LogoutMutation, undefined, { useAuthToken: true });
    } catch {
        // Best-effort — clear the cookie regardless
    }
    await removeAuthToken();
}

export async function leaveAcademyAction() {
    try {
        const result = await mutate(LeaveAcademyMutation, undefined, { useAuthToken: true });
        if (result.data.leaveAcademy.success) {
            return { success: true as const };
        }
        return { success: false as const, error: result.data.leaveAcademy.message ?? 'Failed to leave academy.' };
    } catch {
        return { success: false as const, error: 'An unexpected error occurred. Please try again.' };
    }
}

export async function deleteMyAccountAction(password: string) {
    try {
        const result = await mutate(DeleteMyAccountMutation, { password }, { useAuthToken: true });
        if (result.data.deleteMyAccount.success) {
            return { success: true as const };
        }
        return { success: false as const, error: result.data.deleteMyAccount.message ?? 'Failed to delete account.' };
    } catch {
        return { success: false as const, error: 'An unexpected error occurred. Please try again.' };
    }
}
