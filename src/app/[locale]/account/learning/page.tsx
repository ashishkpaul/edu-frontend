import { query } from '@/lib/vendure/api';
import { GetMyLearningDashboardQuery } from '@/lib/vendure/queries';
import { getRouteLocale } from '@/i18n/server';
import { getAuthToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function LearningDashboardPage() {
    const locale = await getRouteLocale();
    const token = await getAuthToken();

    if (!token) {
        redirect(`/${locale}/sign-in`);
    }

    const { data } = await query(
        GetMyLearningDashboardQuery,
        undefined,
        { useAuthToken: true, languageCode: locale },
    );

    const courses = data.myLearningDashboard?.courses ?? [];

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-8">My Courses</h1>

            {courses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <p>You are not enrolled in any courses yet.</p>
                    <Link
                        href={`/${locale}/search`}
                        className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Browse courses
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            className="rounded-lg border bg-card text-card-foreground shadow-sm p-6"
                        >
                            <h2 className="text-xl font-semibold">{course.title}</h2>

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
                            </div>

                            {course.nextSession && (
                                <div className="mt-4 text-sm">
                                    <p className="text-muted-foreground">Next session:</p>
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
                            ) : (
                                <p className="mt-4 text-sm text-muted-foreground">
                                    No upcoming sessions
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
