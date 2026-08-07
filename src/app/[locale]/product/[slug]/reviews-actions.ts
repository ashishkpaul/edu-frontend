'use server';

import { mutate } from '@/lib/vendure/api';
import { VoteOnReviewMutation, ReportReviewMutation, SubmitProductReviewMutation } from '@/lib/vendure/mutations';

export interface SubmitReviewInput {
    productId: string;
    summary: string;
    body: string;
    rating: number;
    authorName?: string;
}

export async function submitReview(input: SubmitReviewInput) {
    try {
        await mutate(SubmitProductReviewMutation, {
            input: {
                productId: input.productId,
                summary: input.summary,
                body: input.body,
                rating: input.rating,
                authorName: input.authorName || undefined,
            },
        });
        return { success: true as const };
    } catch (err) {
        return { success: false as const, error: err instanceof Error ? err.message : 'Failed to submit review' };
    }
}

export async function voteOnReview(id: string, vote: boolean) {
    try {
        const result = await mutate(VoteOnReviewMutation, { id, vote });
        if (result.data?.voteOnReview) {
            return {
                success: true as const,
                upvotes: result.data.voteOnReview.upvotes ?? 0,
                downvotes: result.data.voteOnReview.downvotes ?? 0,
            };
        }
        return { success: false as const, error: 'Failed to record vote' };
    } catch (err) {
        return { success: false as const, error: err instanceof Error ? err.message : 'Failed to vote' };
    }
}

export async function reportReview(id: string) {
    try {
        await mutate(ReportReviewMutation, {
            input: { id, reason: 'SPAM', comment: 'Reported via product page' },
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to report' };
    }
}
