import { query } from '@/lib/vendure/api';
import { graphql, readFragment, FragmentOf } from '@/graphql';
import ReviewCard, { ReviewCardFragment } from '@/components/commerce/review-card';
import ReviewForm from '@/components/commerce/review-form';
import ReviewActions from './review-actions';

// ─── Co-located query — spreads ReviewCardFragment so gql.tada tracks all
// fields as used through the fragment, satisfying rule 52005. ─────────────────

const ProductReviewsQuery = graphql(`
    query ProductReviewsSection($slug: String!, $skip: Int, $take: Int) {
        product(slug: $slug) {
            id
            reviews(options: { skip: $skip, take: $take }) {
                items {
                    ...ReviewCardFields
                }
            }
        }
    }
`, [ReviewCardFragment]);

interface ReviewsSectionProps {
    productId: string;
    productSlug: string;
}

export default async function ReviewsSection({ productId, productSlug }: ReviewsSectionProps) {
    let items: FragmentOf<typeof ReviewCardFragment>[] = [];

    try {
        const result = await query(ProductReviewsQuery, { slug: productSlug, skip: 0, take: 20 });
        items = (result.data.product?.reviews?.items ?? []) as FragmentOf<typeof ReviewCardFragment>[];
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
                                {items.map((item, index) => {
                                    // Unwrap once for the props that ReviewActions needs directly.
                                    // ReviewCard unwraps internally via readFragment.
                                    const data = readFragment(ReviewCardFragment, item);
                                    return (
                                        <div key={index} className="relative">
                                            <ReviewCard review={item} showActions={false} />
                                            {'id' in data && (
                                                <div className="absolute bottom-4 right-4">
                                                    <ReviewActions
                                                        reviewId={data.id}
                                                        initialUpvotes={data.upvotes}
                                                        initialDownvotes={data.downvotes}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
