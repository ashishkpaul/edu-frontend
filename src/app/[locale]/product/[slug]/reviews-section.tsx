import { query } from '@/lib/vendure/api';
import { graphql } from '@/graphql';
import ReviewCard from '@/components/commerce/review-card';
import ReviewForm from '@/components/commerce/review-form';
import ReviewActions from './review-actions';

// ─── Co-located query (gql.tada co-location lint) ────────────────────────────
// Fields are inlined in this document — no fragment-array second arg (which
// crashes at module evaluation with Next 16.2.1/Turbopack) and no external
// fragment import (which triggers unused-fragment 52003).

const ProductReviewsQuery = graphql(`
    query ProductReviewsSection($slug: String!, $skip: Int, $take: Int) {
        product(slug: $slug) {
            id
            reviews(options: { skip: $skip, take: $take }) {
                items {
                    id
                    summary
                    body
                    rating
                    authorName
                    createdAt
                    verifiedPurchase
                    upvotes
                    downvotes
                }
            }
        }
    }
`);

// ─── Cached data fetcher ─────────────────────────────────────────────────────
// Wraps query() so the item type can be derived from its return type — every
// selected field is then consumed in this file (rule 52005) and items flow into
// ReviewCard type-safely (no `any`).

async function fetchReviews(slug: string, skip: number, take: number) {
    return query(ProductReviewsQuery, { slug, skip, take });
}

// ─── Derived item type ───────────────────────────────────────────────────────
type ReviewItem = NonNullable<
    Awaited<ReturnType<typeof fetchReviews>>['data']['product']
>['reviews']['items'][number];

interface ReviewsSectionProps {
    productId: string;
    productSlug: string;
}

export default async function ReviewsSection({ productId, productSlug }: ReviewsSectionProps) {
    let items: ReviewItem[] = [];

    try {
        const result = await fetchReviews(productSlug, 0, 20);
        items = result.data.product?.reviews?.items ?? [];
    } catch (error) {
        console.error('Failed to load reviews:', error);
    }

    return (
        <section className="py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <h2 className="text-2xl font-bold mb-8">Customer Reviews</h2>

                <div className="grid gap-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                        <ReviewForm productId={productId} />
                    </div>

                    {items.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">
                                {items.length} {items.length === 1 ? 'Review' : 'Reviews'}
                            </h3>
                            <div className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.id} className="relative">
                                        <ReviewCard review={item} showActions={false} />
                                        <div className="absolute bottom-4 right-4">
                                            <ReviewActions
                                                reviewId={item.id}
                                                initialUpvotes={item.upvotes}
                                                initialDownvotes={item.downvotes}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {items.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No reviews yet. Be the first to review this product!</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
