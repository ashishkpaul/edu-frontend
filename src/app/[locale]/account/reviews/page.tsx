import { getAuthToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getRouteLocale } from '@/i18n/server';
import { query } from '@/lib/vendure/api';
import { GetPendingReviewRequestsQuery } from '@/lib/vendure/queries';
import { Clock, Star, ExternalLink } from 'lucide-react';

export default async function AccountReviewsPage() {
    const locale = await getRouteLocale();
    const token = await getAuthToken();

    if (!token) {
        redirect(`/${locale}/sign-in`);
    }

    const pendingResult = await query(
        GetPendingReviewRequestsQuery,
        undefined,
        { useAuthToken: true },
    );

    const pendingRequests = pendingResult.data.pendingReviewRequests?.items ?? [];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Reviews</h1>

            {/* Pending Review Requests */}
            <section className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">
                        Pending Reviews
                        {pendingRequests.length > 0 && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                                {pendingRequests.length}
                            </span>
                        )}
                    </h2>
                </div>

                {pendingRequests.length === 0 ? (
                    <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                        <p>You have no pending review requests.</p>
                        <p className="text-sm mt-2">
                            After purchasing a product, you&apos;ll receive a review request
                            via email once it&apos;s delivered.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingRequests.map((req) => (
                            <div
                                key={req.id}
                                className="flex items-center gap-4 rounded-lg border bg-card p-4"
                            >
                                {req.product.featuredAsset && (
                                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border">
                                        <Image
                                            src={req.product.featuredAsset.preview}
                                            alt={req.product.name}
                                            fill
                                            className="object-cover"
                                            sizes="64px"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{req.product.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Order #{req.order.code}
                                    </p>
                                    {req.expiresAt && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Expires {new Date(req.expiresAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <Link
                                    href={`/${locale}/product/${req.product.slug}#reviews`}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    <Star className="h-3.5 w-3.5" />
                                    Write Review
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Browse to leave reviews */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Leave a Review</h2>
                </div>

                <div className="rounded-lg border bg-card p-6">
                    <p className="text-sm text-muted-foreground mb-4">
                        You can also write a review for any product you&apos;ve purchased
                        directly from the product page.
                    </p>
                    <Link
                        href={`/${locale}/search`}
                        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Browse your purchases
                    </Link>
                </div>
            </section>
        </div>
    );
}
