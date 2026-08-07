'use client';

import { useState, useEffect } from 'react';

// ─── Presentational helpers (Phase 1 — no eligibility logic) ────────────────

export type SessionStatus = 'ENTITLED' | 'UPCOMING' | 'LIVE' | 'JOIN' | 'COMPLETED' | 'REVIEW';

export function getSessionStatus(
    startTime: string,
    endTime: string,
    canJoin: boolean,
): SessionStatus {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (canJoin) return 'JOIN';
    if (now >= start && now <= end) return 'LIVE';
    if (now < start) return 'UPCOMING';
    return 'COMPLETED';
}

export function formatCountdown(startTime: string, endTime: string): string {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now >= start && now <= end) {
        return 'Live now';
    }

    if (now < start) {
        const diffMs = start.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `Starts in ${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        return `Starts in ${diffHours}h ${remainingMins}m`;
    }

    // Ended
    const diffMs = now.getTime() - end.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `Ended ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `Ended ${diffHours}h ago`;
}

const statusStyles: Record<SessionStatus, string> = {
    ENTITLED: 'bg-gray-100 text-gray-800',
    UPCOMING: 'bg-blue-100 text-blue-800',
    LIVE: 'bg-green-100 text-green-800',
    JOIN: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    REVIEW: 'bg-yellow-100 text-yellow-800',
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
            {status}
        </span>
    );
}

export function LiveCountdown({ startTime, endTime }: { startTime: string; endTime: string }) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000); // Update every 30s
        return () => clearInterval(timer);
    }, []);

    const text = formatCountdown(startTime, endTime);
    const isLive = now >= new Date(startTime) && now <= new Date(endTime);

    return (
        <span className={`text-xs font-medium ${isLive ? 'text-green-600' : 'text-muted-foreground'}`}>
            {isLive && '● '}
            {text}
        </span>
    );
}
