import { queryPublic } from '@/lib/vendure/api';
import { GetMarketplaceSearchQuery } from '@/lib/vendure/queries';
import { getRouteLocale } from '@/i18n/server';
import Link from 'next/link';
import { Search, Star, MapPin, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const PAGE_SIZE = 20;

/**
 * Deep-link URL for a marketplace result (storefront audit B-1/B-3).
 *
 * - Custom-domain academies route via their customDomain; the default is the
 *   {academySlug}.saa9vi.com subdomain.
 * - Purchasable sessions deep-link straight to the tenant product page and
 *   carry the opaque, server-signed marketplaceRef as ?ref= — the storefront
 *   only transports the ref; the tenant's Vendure verifies it and classifies
 *   orderSource server-side (INV-008).
 * - Non-purchasable results (no productSlug) fall back to the academy root.
 */
function buildAcademyHref(item: {
    academySlug: string;
    customDomain?: string | null;
    productSlug?: string | null;
    marketplaceRef?: string | null;
}): string {
    const host = item.customDomain || `${item.academySlug}.saa9vi.com`;
    const base = `https://${host}`;
    if (!item.productSlug) return base;
    const ref = item.marketplaceRef ? `?ref=${encodeURIComponent(item.marketplaceRef)}` : '';
    return `${base}/product/${item.productSlug}${ref}`;
}

interface Props {
    searchParams: Promise<{ q?: string; subject?: string; city?: string; page?: string }>;
}

export default async function MarketplacePage({ searchParams }: Props) {
    const locale = await getRouteLocale();
    const params = await searchParams;

    const query = params.q ?? '';
    const subject = params.subject ?? '';
    const city = params.city ?? '';
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const { data } = await queryPublic(
        GetMarketplaceSearchQuery,
        {
            input: {
                query,
                subjectTags: subject ? [subject] : undefined,
                city: city || undefined,
                skip,
                take: PAGE_SIZE,
            },
        },
        { languageCode: locale },
    );

    const { sessions, instructors, totalSessions, totalInstructors } = data.marketplaceSearch;

    const totalPages = Math.max(1, Math.ceil(totalSessions / PAGE_SIZE));
    const hasPrev = page > 1;
    const hasNext = page < totalPages;

    // Build a query-string helper that preserves existing filters
    const buildHref = (overrides: Record<string, string | undefined>) => {
        const sp = new URLSearchParams();
        if (query) sp.set('q', query);
        if (subject) sp.set('subject', subject);
        if (city) sp.set('city', city);
        for (const [key, value] of Object.entries(overrides)) {
            if (value) sp.set(key, value);
            else sp.delete(key);
        }
        const qs = sp.toString();
        return `/${locale}/marketplace${qs ? `?${qs}` : ''}`;
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
            <p className="text-muted-foreground mb-8">
                Discover academies and sessions across the Saa9vi platform
            </p>

            {/* Search + filters */}
            <form className="flex flex-col md:flex-row gap-3 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        name="q"
                        defaultValue={query}
                        placeholder="Search sessions, instructors, academies..."
                        className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm"
                    />
                </div>
                <input
                    type="text"
                    name="subject"
                    defaultValue={subject}
                    placeholder="Subject (e.g. Math)"
                    className="rounded-md border border-input bg-background px-4 py-2 text-sm md:w-48"
                />
                <input
                    type="text"
                    name="city"
                    defaultValue={city}
                    placeholder="City"
                    className="rounded-md border border-input bg-background px-4 py-2 text-sm md:w-40"
                />
                <button
                    type="submit"
                    className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                    Search
                </button>
            </form>

            {/* Active filter chips */}
            {(subject || city) && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    {subject && (
                        <Link
                            href={buildHref({ subject: undefined })}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                        >
                            {subject} ×
                        </Link>
                    )}
                    {city && (
                        <Link
                            href={buildHref({ city: undefined })}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                        >
                            <MapPin className="h-3 w-3" />
                            {city} ×
                        </Link>
                    )}
                </div>
            )}

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
                                    className={`rounded-lg border bg-card p-6 ${
                                        session.isSponsored
                                            ? 'border-yellow-300/60 shadow-sm'
                                            : ''
                                    }`}
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
                                            <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-yellow-100 to-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                                                <Sparkles className="h-3 w-3" />
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
                                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                                {session.bayesianRating.toFixed(1)}
                                            </span>
                                        )}
                                        {session.subjectTags.length > 0 && (
                                            <span className="flex flex-wrap gap-1">
                                                {session.subjectTags.slice(0, 3).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </span>
                                        )}
                                    </div>
                                    <Link
                                        href={buildAcademyHref(session)}
                                        className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
                                    >
                                        {session.productSlug ? 'View session →' : 'Visit academy →'}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-8">
                            <Link
                                href={buildHref({ page: hasPrev ? String(page - 1) : undefined })}
                                className={`inline-flex items-center gap-1 rounded-md border border-input px-4 py-2 text-sm font-medium ${
                                    hasPrev
                                        ? 'hover:bg-muted'
                                        : 'pointer-events-none opacity-50'
                                }`}
                                aria-disabled={!hasPrev}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Link>
                            <span className="text-sm text-muted-foreground">
                                Page {page} of {totalPages}
                            </span>
                            <Link
                                href={buildHref({ page: hasNext ? String(page + 1) : undefined })}
                                className={`inline-flex items-center gap-1 rounded-md border border-input px-4 py-2 text-sm font-medium ${
                                    hasNext
                                        ? 'hover:bg-muted'
                                        : 'pointer-events-none opacity-50'
                                }`}
                                aria-disabled={!hasNext}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Link>
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
                                        <p className="inline-flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                            {instructor.reviewRating.toFixed(1)}
                                        </p>
                                    )}
                                    {instructor.subjectTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {instructor.subjectTags.slice(0, 3).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <Link
                                        href={buildAcademyHref(instructor)}
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
