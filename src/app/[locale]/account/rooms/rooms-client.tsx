'use client';

import { useState } from 'react';
import { joinRoomAction } from './actions';
import type { ClassAction, RoomCard } from './rooms-types';

// ─── Labels ─────────────────────────────────────────────────────────────────
// Server-driven: the backend tells us WHICH action applies (INV-008); the copy
// for each action lives here because it is presentation, not business logic.
const BUTTON_LABEL: Record<'START' | 'JOIN', string> = {
    START: 'Start class',
    JOIN: 'Join class',
};
const WAITING_COPY = 'Waiting for a trainer to start this class.';
const UNAVAILABLE_COPY =
    'This classroom cannot be opened right now — your academy team needs to reset it.';
const FAILED_COPY = 'Could not open this classroom. Please try again.';

/** Bounded wait while a START provisions the room before the join URL exists. */
const PROVISION_ATTEMPTS = 15;
const PROVISION_INTERVAL_MS = 2000;

interface RoomsClientProps {
    initialRooms: RoomCard[];
    participantName: string;
}

export default function RoomsClient({ initialRooms, participantName }: RoomsClientProps) {
    const [rooms, setRooms] = useState<RoomCard[]>(initialRooms);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    async function runAction(room: RoomCard) {
        setPendingId(room.id);
        setNotice(null);
        try {
            for (let attempt = 0; attempt < PROVISION_ATTEMPTS; attempt++) {
                const res = await joinRoomAction(room.id, participantName);

                if (res.joinUrl) {
                    window.location.href = res.joinUrl;
                    return;
                }

                if (res.status === 'waiting_for_trainer') {
                    // The room is not live and this caller may not start it —
                    // reflect the server's verdict instead of retrying.
                    setRooms((current) =>
                        current.map((r) =>
                            r.id === room.id ? { ...r, classAction: 'WAIT' } : r,
                        ),
                    );
                    return;
                }

                if (res.status === 'failed') {
                    setNotice(FAILED_COPY);
                    return;
                }

                // `provisioning` — the room is starting; poll again.
                await new Promise((resolve) => setTimeout(resolve, PROVISION_INTERVAL_MS));
            }
            setNotice('The classroom is still starting. Refresh this page in a moment.');
        } finally {
            setPendingId(null);
        }
    }

    return (
        <div className="space-y-4">
            {notice && (
                <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {notice}
                </p>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => {
                    const action = room.classAction;
                    const isRunnable = action === 'START' || action === 'JOIN';
                    const isPending = pendingId === room.id;

                    return (
                        <div key={room.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                            <div className="flex items-start justify-between gap-2">
                                <h2 className="text-xl font-semibold">{room.name}</h2>
                                <span className="text-xs font-medium text-muted-foreground">{room.state}</span>
                            </div>

                            <div className="mt-4">
                                {isRunnable ? (
                                    <button
                                        type="button"
                                        onClick={() => void runAction(room)}
                                        disabled={isPending}
                                        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                    >
                                        {isPending ? 'Opening…' : BUTTON_LABEL[action as 'START' | 'JOIN']}
                                    </button>
                                ) : action === 'WAIT' ? (
                                    <p className="text-sm text-muted-foreground">{WAITING_COPY}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{UNAVAILABLE_COPY}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
