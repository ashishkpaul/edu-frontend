'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOutAction, leaveAcademyAction, deleteMyAccountAction } from './actions';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, LogOut, Trash2, ShieldAlert } from 'lucide-react';

export default function AccountSettingsClient() {
    const router = useRouter();

    // ─── Leave Academy state ─────────────────────────────────────────────
    const [leavingAcademy, setLeavingAcademy] = useState(false);

    // ─── Delete Account state ────────────────────────────────────────────
    const [deletePassword, setDeletePassword] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleLeaveAcademy = async () => {
        setLeavingAcademy(true);
        try {
            const result = await leaveAcademyAction();
            if (result.success) {
                toast.success('You have left the academy. Redirecting…');
                await signOutAction();
                router.push('/');
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } finally {
            setLeavingAcademy(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            toast.error('Please enter your password to confirm deletion.');
            return;
        }

        setDeletingAccount(true);
        try {
            const result = await deleteMyAccountAction(deletePassword);

            if (result.success) {
                toast.success('Your account has been deleted.');
                await signOutAction();
                router.push('/');
                router.refresh();
            } else {
                toast.error(result.error);
                setDeleteDialogOpen(false);
            }
        } finally {
            setDeletingAccount(false);
            setDeletePassword('');
        }
    };

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your account and academy membership.
                </p>
            </div>

            {/* ─── Leave Academy ──────────────────────────────────────────── */}
            <section className="rounded-lg border bg-card p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <LogOut className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                        <h2 className="text-lg font-semibold">Leave Academy</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Remove yourself from this academy. Your entitlements and session
                            access will be deactivated. Your account remains active — you can
                            re-join or use other academies on the platform.
                        </p>
                    </div>
                </div>

                <AlertDialog>
                    <AlertDialogTrigger>
                        <button
                            disabled={leavingAcademy}
                            className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {leavingAcademy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <LogOut className="h-4 w-4" />
                            )}
                            Leave Academy
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Leave this academy?</AlertDialogTitle>
                            <AlertDialogDescription>
                                You will lose access to all sessions and entitlements in this
                                academy. Your account will not be deleted — you can re-join if
                                the academy allows it.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleLeaveAcademy}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Yes, leave academy
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </section>

            {/* ─── Delete Account ─────────────────────────────────────────── */}
            <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                        <h2 className="text-lg font-semibold text-destructive">
                            Delete Account
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Permanently delete your account and all associated data. This
                            action is <strong>irreversible</strong>. All orders, reviews,
                            entitlements, and personal data will be anonymised and cannot be
                            recovered.
                        </p>
                    </div>
                </div>

                <AlertDialog
                    open={deleteDialogOpen}
                    onOpenChange={(open) => {
                        setDeleteDialogOpen(open);
                        if (!open) setDeletePassword('');
                    }}
                >
                    <AlertDialogTrigger>
                        <button
                            disabled={deletingAccount}
                            className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {deletingAccount ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                            Delete my account
                        </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-destructive">
                                Permanently delete account?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This cannot be undone. All your data will be permanently
                                anonymised.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {/* Password input lives outside AlertDialogDescription to avoid asChild issues */}
                        <div className="space-y-1.5 px-0">
                            <label
                                htmlFor="delete-password"
                                className="text-sm font-medium"
                            >
                                Enter your current password to confirm
                            </label>
                            <input
                                id="delete-password"
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Password"
                                autoComplete="current-password"
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteAccount}
                                disabled={!deletePassword || deletingAccount}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                            >
                                {deletingAccount ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Deleting…
                                    </>
                                ) : (
                                    'Yes, delete my account'
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </section>
        </div>
    );
}
