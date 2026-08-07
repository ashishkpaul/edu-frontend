import { query, getChannelTokenFromHeaders } from '@/lib/vendure/api';
import { graphql } from '@/graphql';
import { getRouteLocale } from '@/i18n/server';
import { getChannelToken } from '@/lib/vendure/channel';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {
    SITE_NAME,
    truncateDescription,
    buildCanonicalUrl,
    buildOgImages,
} from '@/lib/metadata';
import { CalendarDays, Tag, ArrowLeft } from 'lucide-react';

interface PageProps {
    params: Promise<{ slug: string; locale: string }>;
}

// ─── Co-located query (gql.tada co-location lint) ────────────────────────────

const BlogArticleQuery = graphql(`
    query BlogArticle($slug: String!) {
        cmsArticle(slug: $slug) {
            id
            title
            slug
            excerpt
            body
            publishedAt
            featuredAsset {
                id
                preview
            }
            tags
        }
    }
`);

// ─── Cached data fetcher ──────────────────────────────────────────────────────

async function getArticle(slug: string, channelToken: string, locale: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`blog-article-${slug}-${channelToken}-${locale}`);

    return query(
        BlogArticleQuery,
        { slug },
        { languageCode: locale, channelToken },
    );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const locale = await getRouteLocale();
    const channelToken = (await getChannelTokenFromHeaders()) || getChannelToken();
    const result = await getArticle(slug, channelToken, locale);
    const article = result.data.cmsArticle;

    if (!article) {
        return { title: 'Article Not Found' };
    }

    const description = truncateDescription(article.excerpt ?? article.body);
    const ogImage = article.featuredAsset?.preview;

    return {
        title: `${article.title} — ${SITE_NAME}`,
        description: description || `Read ${article.title} on ${SITE_NAME}`,
        alternates: {
            canonical: buildCanonicalUrl(`/${locale}/blog/${slug}`),
        },
        openGraph: {
            title: article.title,
            description: description || `Read ${article.title} on ${SITE_NAME}`,
            type: 'article',
            publishedTime: article.publishedAt ?? undefined,
            tags: article.tags ?? undefined,
            images: buildOgImages(ogImage, article.title),
        },
    };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogArticlePage({ params }: PageProps) {
    const { slug } = await params;
    const locale = await getRouteLocale();
    const channelToken = (await getChannelTokenFromHeaders()) || getChannelToken();
    const result = await getArticle(slug, channelToken, locale);
    const article = result.data.cmsArticle;

    if (!article) {
        notFound();
    }

    const publishedDate = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : null;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto">
                {/* Back link */}
                <Link
                    href={`/${locale}/blog`}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Blog
                </Link>

                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-4xl font-bold leading-tight">{article.title}</h1>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {publishedDate && (
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-4 w-4" />
                                {publishedDate}
                            </span>
                        )}
                        {article.tags && article.tags.length > 0 && (
                            <span className="inline-flex items-center gap-1.5">
                                <Tag className="h-4 w-4" />
                                {article.tags.join(', ')}
                            </span>
                        )}
                    </div>
                </header>

                {/* Featured image */}
                {article.featuredAsset && (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-10 bg-muted">
                        <Image
                            src={article.featuredAsset.preview}
                            alt={article.title}
                            fill
                            priority
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 768px"
                        />
                    </div>
                )}

                {/* Excerpt */}
                {article.excerpt && (
                    <p className="text-lg text-muted-foreground mb-8 leading-relaxed border-l-4 border-primary pl-4">
                        {article.excerpt}
                    </p>
                )}

                {/* Body — rendered as prose */}
                {/* Body is stored as plain text / markdown. Render with whitespace preserved.
                    For HTML bodies, use dangerouslySetInnerHTML only when content is admin-authored. */}
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                    {article.body.split('\n').map((paragraph, i) =>
                        paragraph.trim() ? (
                            <p key={i}>{paragraph}</p>
                        ) : (
                            <br key={i} />
                        ),
                    )}
                </div>

                {/* Tags footer */}
                {article.tags && article.tags.length > 0 && (
                    <div className="mt-12 pt-6 border-t flex flex-wrap gap-2">
                        {article.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
