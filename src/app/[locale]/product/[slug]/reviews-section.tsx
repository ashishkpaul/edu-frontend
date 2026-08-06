'use client';

import { useState, useEffect } from 'react';
import ReviewCard from '@/components/commerce/review-card';
import ReviewForm from '@/components/commerce/review-form';
import { GetProductReviewsQuery } from '@/lib/vendure/queries';
import { query } from '@/lib/vendure/api';

interface ReviewsSectionProps {
    productId: string;
    productSlug: string;
}

export default function ReviewsSection({ productId, productSlug }: ReviewsSectionProps) {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        async function loadReviews() {
            try {
                const result = await query(GetProductReviewsQuery, { slug: productSlug, skip: 0, take: 20 });
                setReviews(result.data.product?.reviews?.items || []);
            } catch (error) {
                console.error('Failed to load reviews:', error);
            } finally {
                setLoading(false);
            }
        }

        loadReviews();
    }, [productSlug, refreshKey]);

    const handleReviewSubmitted = () => {
        setRefreshKey(prev => prev + 1);
    };

    if (loading) {
        return (
            <section className="py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <h2 className="text-2xl font-bold mb-8">Customer Reviews</h2>
                    <div className="text-center text-muted-foreground">Loading reviews...</div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-16">
            <div className="container mx-auto px-4 max-w-4xl">
                <h2 className="text-2xl font-bold mb-8">Customer Reviews</h2>

                <div className="grid gap-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
                        <ReviewForm productId={productId} onSuccess={handleReviewSubmitted} />
                    </div>

                    {reviews.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">
                                {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                            </h3>
                            <div className="space-y-4">
                                {reviews.map((review) => (
                                    <ReviewCard key={review.id} review={review} />
                                ))}
                            </div>
                        </div>
                    )}

                    {reviews.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No reviews yet. Be the first to review this product!</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
