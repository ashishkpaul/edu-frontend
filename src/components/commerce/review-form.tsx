'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { submitReview } from '@/app/[locale]/product/[slug]/reviews-actions';

interface ReviewFormProps {
    productId: string;
    onSuccess?: () => void;
}

export default function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [summary, setSummary] = useState('');
    const [body, setBody] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (rating === 0) {
            setError('Please select a rating');
            return;
        }

        setSubmitting(true);

        try {
            const result = await submitReview({
                productId,
                summary,
                body,
                rating,
                authorName: authorName || undefined,
            });

            if (result.success) {
                // Reset form
                setRating(0);
                setSummary('');
                setBody('');
                setAuthorName('');
                onSuccess?.();
            } else {
                setError(result.error);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card text-card-foreground p-4">
            <h3 className="font-semibold">Write a Review</h3>

            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-colors"
                        >
                            <Star
                                className={`h-6 w-6 ${
                                    star <= (hoverRating || rating)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-muted-foreground'
                                }`}
                            />
                        </button>
                    ))}
                    {rating > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                            {rating}/5
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="summary" className="text-sm font-medium">Summary</label>
                <input
                    id="summary"
                    type="text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Brief summary of your review"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="body" className="text-sm font-medium">Review</label>
                <textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Share your experience with this product"
                    required
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="authorName" className="text-sm font-medium">Your Name (optional)</label>
                <input
                    id="authorName"
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Display name"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {submitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                    </>
                ) : (
                    'Submit Review'
                )}
            </button>
        </form>
    );
}
