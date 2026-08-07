'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { voteOnReview, reportReview } from './reviews-actions';

interface ReviewActionsProps {
    reviewId: string;
    initialUpvotes: number;
    initialDownvotes: number;
}

export default function ReviewActions({ reviewId, initialUpvotes, initialDownvotes }: ReviewActionsProps) {
    const [upvotes, setUpvotes] = useState(initialUpvotes);
    const [downvotes, setDownvotes] = useState(initialDownvotes);
    const [busy, setBusy] = useState(false);

    const handleVote = async (vote: boolean) => {
        if (busy) return;
        setBusy(true);
        try {
            const result = await voteOnReview(reviewId, vote);
            if (result.success) {
                setUpvotes(result.upvotes);
                setDownvotes(result.downvotes);
                toast.success('Your vote has been recorded');
            } else {
                toast.error(result.error || 'Failed to vote');
            }
        } finally {
            setBusy(false);
        }
    };

    const handleReport = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const result = await reportReview(reviewId);
            if (result.success) {
                toast.success('Review reported. Our team will investigate.');
            } else {
                toast.error(result.error || 'Failed to report review');
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => handleVote(true)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 hover:text-green-600 transition-colors disabled:opacity-50"
                    title="Upvote"
                >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>{upvotes}</span>
                </button>
                <button
                    onClick={() => handleVote(false)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Downvote"
                >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>{downvotes}</span>
                </button>
            </div>
            <button
                onClick={handleReport}
                disabled={busy}
                className="inline-flex items-center gap-1 hover:text-destructive transition-colors disabled:opacity-50"
                title="Report review"
            >
                <Flag className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
