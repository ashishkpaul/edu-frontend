import { Suspense } from 'react';
import { query } from '@/lib/vendure/api';
import { GetProductReviewsQuery, CanReviewProductQuery } from '@/lib/vendure/queries';
import { getAuthToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getRouteLocale } from '@/i18n/server';
import { getTranslations } from 'next-intl/server';
import ReviewCard from '@/components/commerce/review-card';
import { Loader2 } from 'lucide-react';

export default async function AccountReviewsPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({ locale, namespace: 'Account' });
    const token = await getAuthToken();

    if (!token) {
        redirect(`/${locale}/sign-in`);
    }

    // Fetch pending review requests and user's existing reviews
    // Note: This is a simplified version - in production you'd want to:
    // 1. Query pendingReviewRequests from the API
    // 2. Query user's submitted reviews
    // 3. Handle review request tokens for email flow (Phase 2C)

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">{t('reviews.title')}</h1>

            {/* Pending Review Requests */}
            <section className="mb-12">
                <h2 className="text-2xl font-semibold mb-4">Pending Reviews</h2>
                <div className="rounded-lg border bg-card text-card-foreground p-8 text-center text-muted-foreground">
                    <p>You have no pending review requests.</p>
                    <p className="text-sm mt-2">After purchasing a product, you'll receive a review request via email.</p>
                </div>
            </section>

            {/* Past Reviews */}
            <section>
                <h2 className="text-2xl font-semibold mb-4">Your Reviews</h2>
                <div className="rounded-lg border bg-card text-card-foreground p-8 text-center text-muted-foreground">
                    <p>You haven't written any reviews yet.</p>
                    <Link
                        href={`/${locale}/search`}
                        className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Browse products to review
                    </Link>
                </div>
            </section>
        </div>
    );
}
