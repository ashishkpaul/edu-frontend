import { query, getChannelTokenFromHeaders } from '@/lib/vendure/api';
import { graphql } from '@/graphql';
import { getRouteLocale } from '@/i18n/server';
import { getChannelToken } from '@/lib/vendure/channel';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageRenderer } from '@/components/cms/page-renderer';
import {
    SITE_NAME,
    truncateDescription,
    buildCanonicalUrl,
    buildOgImages,
} from '@/lib/metadata';

interface PageProps {
    params: Promise<{ slug: string; locale: string }>;
}

// ─── Co-located query ────────────────────────────────────────────────────────

const CmsPageQuery = graphql(`
    query CmsPage($slug: String!) {
        cmsPage(slug: $slug) {
            id
            slug
            title
            metaDescription
            sections
        }
    }
`);

// ─── Cached data fetcher ─────────────────────────────────────────────────────

async function getPage(slug: string, channelToken: string, locale: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`cms-page-${slug}-${channelToken}-${locale}`);

    return query(
        CmsPageQuery,
        { slug },
        { languageCode: locale, channelToken },
    );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const locale = await getRouteLocale();
    const channelToken = (await getChannelTokenFromHeaders()) || getChannelToken();
    const result = await getPage(slug, channelToken, locale);
    const page = result.data.cmsPage;

    if (!page) {
        return { title: 'Page Not Found' };
    }

    const description = truncateDescription(page.metaDescription ?? page.title);

    return {
        title: `${page.title} — ${SITE_NAME}`,
        description: description || `Read ${page.title} on ${SITE_NAME}`,
        alternates: {
            canonical: buildCanonicalUrl(`/${locale}/page/${slug}`),
        },
        openGraph: {
            title: page.title,
            description: description || `Read ${page.title} on ${SITE_NAME}`,
            type: 'website',
            images: buildOgImages(undefined, page.title),
        },
    };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CmsPage({ params }: PageProps) {
    const { slug } = await params;
    const locale = await getRouteLocale();
    const channelToken = (await getChannelTokenFromHeaders()) || getChannelToken();
    const result = await getPage(slug, channelToken, locale);
    const page = result.data.cmsPage;

    if (!page) {
        notFound();
    }

    return (
        <div className="min-h-screen">
            <PageRenderer sections={page.sections} />
        </div>
    );
}
