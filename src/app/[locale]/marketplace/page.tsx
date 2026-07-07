import { query } from '@/lib/vendure/api';
import { GetMarketplaceSearchQuery } from '@/lib/vendure/queries';
import { getRouteLocale } from '@/i18n/server';
import Link from 'next/link';

interface Props {
    searchParams: Promise<{ q?: string; subject?: string; city?: string }>;
}

export default async function MarketplacePage({ searchParams }: Props) {
    const locale = await getRouteLocale();
    const params = await searchParams;

    const { data } = await query(
        GetMarketplaceSearchQuery,
        {
            input: {
                query: params.q ?? '',
                subjectTags: params.subject ? [params.subject] : undefined,
                city: params.city,
                skip: 0,
                take: 20,
            },
        },
        { languageCode: locale },
    );

    const { sessions, instructors, totalSessions, totalInstructors } = data.marketplaceSearch;

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
            <p className="text-muted-foreground mb-8">
                Discover academies and sessions across the Saa9vi platform
            </p>

            {/* Search form */}
            <form className="flex gap-4 mb-8">
                <input
                    type="text"
                    name="q"
                    defaultValue={params.q ?? ''}
                    placeholder="Search sessions, instructors, academies..."
                    className="flex-1 rounded-md border border-input bg-background px-4 py-2 text-sm"
                />
                <button
                    type="submit"
                    className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    Search
                </button>
            </form>

            {/* Results */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Sessions */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">
                        Sessions ({totalSessions})
                    </h2>
                    {sessions.length === 0 ? (
                        <p className="text-muted-foreground">No sessions found.</p>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="rounded-lg border bg-card p-6"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold">{session.title}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {session.academyName}
                                            </p>
                                            {session.instructorName && (
                                                <p className="text-sm text-muted-foreground">
                                                    by {session.instructorName}
                                                </p>
                                            )}
                                        </div>
                                        {session.isSponsored && (
                                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                                Sponsored
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-4 flex items-center gap-4 text-sm">
                                        {session.priceInPaise != null && (
                                            <span className="font-medium">
                                                ₹{(session.priceInPaise / 100).toFixed(2)}
                                            </span>
                                        )}
                                        {session.bayesianRating != null && (
                                            <span className="text-muted-foreground">
                                                ★ {session.bayesianRating.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    <Link
                                        href={`https://${session.academySlug}.saa9vi.com`}
                                        className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
                                    >
                                        Visit academy →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Instructors sidebar */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">
                        Instructors ({totalInstructors})
                    </h2>
                    {instructors.length === 0 ? (
                        <p className="text-muted-foreground">No instructors found.</p>
                    ) : (
                        <div className="space-y-4">
                            {instructors.map((instructor) => (
                                <div
                                    key={instructor.id}
                                    className="rounded-lg border bg-card p-4"
                                >
                                    <h3 className="font-semibold">{instructor.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {instructor.academyName}
                                    </p>
                                    {instructor.reviewRating != null && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            ★ {instructor.reviewRating.toFixed(1)}
                                        </p>
                                    )}
                                    <Link
                                        href={`https://${instructor.academySlug}.saa9vi.com`}
                                        className="mt-2 inline-flex items-center text-sm text-primary hover:underline"
                                    >
                                        View academy →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
