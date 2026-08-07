import { query, getChannelTokenFromHeaders } from '@/lib/vendure/api';
import { graphql } from '@/graphql';
import { getRouteLocale } from '@/i18n/server';
import { getChannelToken } from '@/lib/vendure/channel';
import { cacheLife, cacheTag } from 'next/cache';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/metadata';
import { CalendarDays, Tag } from 'lucide-react';

// ─── Co-located query (gql.tada co-location lint) ────────────────────────────

const BlogArticlesQuery = graphql(`
    query BlogArticles($options: ArticleListOptions) {
        cmsArticles(options: $options) {
            items {
                id
                title
                slug
                excerpt
                publishedAt
                featuredAsset {
                    id
                    preview
                }
                tags
            }
            totalItems
        }
    }
`);

// ─── Cached data fetcher (channel-aware) ────────────────────────────────────

async function getArticles(channelToken: string, locale: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`blog-list-${channelToken}-${locale}`);

    return query(
        BlogArticlesQuery,
        { options: { take: 50, skip: 0 } },
        { languageCode: locale, channelToken },
    );
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export const metadata: Metadata = {
    title: `Blog — ${SITE_NAME}`,
    description: `Latest articles, news, and updates from ${SITE_NAME}.`,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function BlogListPage() {
    const locale = await getRouteLocale();
    const channelToken = (await getChannelTokenFromHeaders()) || getChannelToken();
    const result = await getArticles(channelToken, locale);

    const articles = result.data.cmsArticles?.items ?? [];

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-2">Blog</h1>
                <p className="text-muted-foreground mb-10">
                    Latest articles, guides, and updates.
                </p>

                {articles.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No articles published yet. Check back soon.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {articles.map((article) => (
                            <ArticleCard
                                key={article.id}
                                article={article}
                                locale={locale}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Article list card ───────────────────────────────────────────────────────

type ArticleItem = NonNullable<
    Awaited<ReturnType<typeof getArticles>>['data']['cmsArticles']
>['items'][number];

function ArticleCard({ article, locale }: { article: ArticleItem; locale: string }) {
    const publishedDate = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : null;

    return (
        <article className="group flex flex-col sm:flex-row gap-6 rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
            {article.featuredAsset && (
                <Link
                    href={`/${locale}/blog/${article.slug}`}
                    className="relative w-full sm:w-48 h-40 sm:h-32 shrink-0 overflow-hidden rounded-md bg-muted"
                >
                    <Image
                        src={article.featuredAsset.preview}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 192px"
                    />
                </Link>
            )}

            <div className="flex flex-col flex-1 min-w-0">
                <Link href={`/${locale}/blog/${article.slug}`}>
                    <h2 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                    </h2>
                </Link>

                {article.excerpt && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {article.excerpt}
                    </p>
                )}

                <div className="mt-auto pt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {publishedDate && (
                        <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {publishedDate}
                        </span>
                    )}
                    {article.tags && article.tags.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" />
                            {article.tags.slice(0, 3).join(', ')}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}
