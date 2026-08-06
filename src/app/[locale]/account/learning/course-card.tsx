'use client';

import { LiveCountdown, SessionStatusBadge, getSessionStatus } from './session-helpers';
import Link from 'next/link';

interface Course {
    id: string;
    title: string;
    instructorName: string | null;
    entitlementSource: string;
    entitlementType: string;
    isTrial: boolean | unknown; // TODO: regenerate GraphQL types after schema change
    nextSession: { startsAt: string; endsAt: string } | null;
    canJoin: boolean;
    joinUrl: string | null;
}

interface CourseCardProps {
    course: Course;
    locale: string;
}

export default function CourseCard({ course, locale }: CourseCardProps) {
    const status = course.nextSession
        ? getSessionStatus(course.nextSession.startsAt, course.nextSession.endsAt, course.canJoin)
        : 'ENTITLED';

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-semibold">{course.title}</h2>
                {course.nextSession && <SessionStatusBadge status={status} />}
            </div>

            {course.instructorName && (
                <p className="text-sm text-muted-foreground mt-1">
                    Instructor: {course.instructorName}
                </p>
            )}

            <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {course.entitlementSource}
                </span>
                <span className="text-xs text-muted-foreground">
                    {course.entitlementType}
                </span>
                {course.isTrial === true && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                        Trial
                    </span>
                )}
            </div>

            {course.nextSession && (
                <div className="mt-4 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">Next session:</p>
                        <LiveCountdown
                            startTime={course.nextSession.startsAt}
                            endTime={course.nextSession.endsAt}
                            canJoin={course.canJoin}
                        />
                    </div>
                    <p>
                        {new Date(course.nextSession.startsAt).toLocaleDateString()}
                        {' — '}
                        {new Date(course.nextSession.endsAt).toLocaleTimeString()}
                    </p>
                </div>
            )}

            {course.canJoin && course.joinUrl ? (
                <a
                    href={course.joinUrl}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    Join class
                </a>
            ) : course.nextSession ? (
                <p className="mt-4 text-sm text-muted-foreground">
                    {status === 'LIVE' || status === 'JOIN'
                        ? 'Session starting soon...'
                        : 'Not yet available'}
                </p>
            ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                    No upcoming sessions
                </p>
            )}
        </div>
    );
}
