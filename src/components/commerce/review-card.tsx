'use client';

import { Star, ThumbsUp, ThumbsDown, Flag, CheckCircle } from 'lucide-react';

// ─── Plain domain type ───────────────────────────────────────────────────────
// Mirrors the fields selected by the co-located review query. No gql.tada
// fragment here: the fragment-free pattern avoids the unused-fragment lint
// (52003) and keeps the query document the single source of truth
// (see reviews-section.tsx, which derives its item type from the query).
export interface Review {
    id: string;
    summary: string;
    body: string | null;
    rating: number;
    authorName: string;
    createdAt: string;
    verifiedPurchase: boolean;
    upvotes: number;
    downvotes: number;
}

interface ReviewCardProps {
    review: Review;
    onVote?: (id: string, vote: boolean) => void;
    onReport?: (id: string) => void;
    showActions?: boolean;
}

export default function ReviewCard({ review, onVote, onReport, showActions = true }: ReviewCardProps) {
    const date = new Date(review.createdAt).toLocaleDateString();

    return (
        <div className="rounded-lg border bg-card text-card-foreground p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                        star <= review.rating
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-muted-foreground'
                                    }`}
                                />
                            ))}
                        </div>
                        <span className="text-sm font-medium">{review.rating}/5</span>
                    </div>
                    <h4 className="font-semibold text-sm">{review.summary}</h4>
                </div>
                {review.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                    </span>
                )}
            </div>

            {review.body && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{review.body}</p>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    {review.authorName} · {date}
                </span>
                {showActions && (
                    <div className="flex items-center gap-3">
                        {onVote && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onVote(review.id, true)}
                                    className="inline-flex items-center gap-1 hover:text-green-600 transition-colors"
                                    title="Upvote"
                                >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                    <span>{review.upvotes}</span>
                                </button>
                                <button
                                    onClick={() => onVote(review.id, false)}
                                    className="inline-flex items-center gap-1 hover:text-red-600 transition-colors"
                                    title="Downvote"
                                >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                    <span>{review.downvotes}</span>
                                </button>
                            </div>
                        )}
                        {onReport && (
                            <button
                                onClick={() => onReport(review.id)}
                                className="inline-flex items-center gap-1 hover:text-destructive transition-colors"
                                title="Report review"
                            >
                                <Flag className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
