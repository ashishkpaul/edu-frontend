'use client';

import { useEffect, useState } from 'react';
import CourseCard, { LearningCourse } from './course-card';
import { getLearningDashboardAction } from './actions';

interface LearningDashboardClientProps {
    initialCourses: LearningCourse[];
}

/**
 * Client container for the learning dashboard.
 *
 * Renders the server-fetched courses and polls the backend `getLearningDashboardAction`
 * every 30s so that when a session transitions to LIVE (and the backend provisions an
 * active meeting + joinUrl), the Join button appears without a manual refresh.
 *
 * Eligibility is entirely server-driven (INV-008) — this component only reflects the
 * server-provided canJoin/joinUrl.
 */
export default function LearningDashboardClient({ initialCourses }: LearningDashboardClientProps) {
    const [courses, setCourses] = useState<LearningCourse[]>(initialCourses);

    useEffect(() => {
        let cancelled = false;

        const poll = async () => {
            const result = await getLearningDashboardAction();
            if (cancelled) return;
            // `courses: null` means the fetch failed — keep the current list.
            if (Array.isArray(result.courses)) {
                setCourses(result.courses);
            }
        };

        // Poll on an interval aligned with the countdown tick (30s).
        const timer = setInterval(poll, 30000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
            ))}
        </div>
    );
}
