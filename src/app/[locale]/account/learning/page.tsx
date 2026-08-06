import { query } from '@/lib/vendure/api';
import { GetMyLearningDashboardQuery } from '@/lib/vendure/queries';
import { getRouteLocale } from '@/i18n/server';
import { getAuthToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CourseCard from './course-card';

// ─── Page component ─────────────────────────────────────────────────────────

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
                        <CourseCard
                            key={course.id}
                            course={course}
                            locale={locale}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
