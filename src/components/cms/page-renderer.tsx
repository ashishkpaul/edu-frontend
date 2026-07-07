/**
 * CMS Page Renderer
 *
 * Renders a CmsPage's sections array as React components.
 * sections is a JSON! scalar from the GraphQL API — the server deliberately
 * keeps it untyped so new section types don't require a schema migration.
 * The discriminated-union parsing happens entirely client-side here.
 */

import React from 'react';

// ─── Section type definitions ───────────────────────────────────────────

export interface HeroSection {
    type: 'hero';
    title?: string;
    subtitle?: string;
    backgroundImage?: string;
    ctaText?: string;
    ctaLink?: string;
}

export interface RichTextSection {
    type: 'richText';
    body?: string;
}

export interface ProductGridSection {
    type: 'productGrid';
    title?: string;
    collectionSlug?: string;
    maxProducts?: number;
}

export interface ArticleGridSection {
    type: 'articleGrid';
    title?: string;
    maxArticles?: number;
}

export interface BannerSlotSection {
    type: 'bannerSlot';
    placement?: string;
}

export type PageSection = HeroSection | RichTextSection | ProductGridSection | ArticleGridSection | BannerSlotSection;

// ─── Section renderers ──────────────────────────────────────────────────

function HeroSectionRenderer({ section }: { section: HeroSection }) {
    return (
        <section className="relative w-full bg-gradient-to-br from-primary/10 to-primary/5 py-20">
            <div className="container mx-auto px-4 text-center">
                {section.title && (
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                        {section.title}
                    </h1>
                )}
                {section.subtitle && (
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        {section.subtitle}
                    </p>
                )}
                {section.ctaText && section.ctaLink && (
                    <a
                        href={section.ctaLink}
                        className="mt-8 inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                        {section.ctaText}
                    </a>
                )}
            </div>
        </section>
    );
}

function RichTextSectionRenderer({ section }: { section: RichTextSection }) {
    if (!section.body) return null;
    return (
        <section className="py-12">
            <div className="container mx-auto px-4">
                <div
                    className="prose prose-lg max-w-3xl mx-auto"
                    dangerouslySetInnerHTML={{ __html: section.body }}
                />
            </div>
        </section>
    );
}

function ProductGridSectionRenderer({ section }: { section: ProductGridSection }) {
    return (
        <section className="py-12">
            <div className="container mx-auto px-4">
                {section.title && (
                    <h2 className="text-2xl font-bold mb-6">{section.title}</h2>
                )}
                {/* Product grid content is rendered by the parent page component
                    which has access to the collection data. This section signals
                    which collection to render. */}
                <div className="text-muted-foreground text-sm">
                    Collection: {section.collectionSlug ?? 'N/A'}
                </div>
            </div>
        </section>
    );
}

function ArticleGridSectionRenderer({ section }: { section: ArticleGridSection }) {
    return (
        <section className="py-12">
            <div className="container mx-auto px-4">
                {section.title && (
                    <h2 className="text-2xl font-bold mb-6">{section.title}</h2>
                )}
                <div className="text-muted-foreground text-sm">
                    Articles grid (max: {section.maxArticles ?? 'unlimited'})
                </div>
            </div>
        </section>
    );
}

function BannerSlotSectionRenderer({ section }: { section: BannerSlotSection }) {
    return (
        <section className="py-8">
            <div className="container mx-auto px-4">
                <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
                    <p className="text-sm text-muted-foreground">
                        Banner slot: {section.placement ?? 'default'}
                    </p>
                </div>
            </div>
        </section>
    );
}

// ─── Main renderer ──────────────────────────────────────────────────────

interface PageRendererProps {
    sections: unknown;
}

/**
 * Renders an array of CMS page sections.
 * The `sections` prop comes from the `cmsPage.sections` JSON! scalar.
 * Parsing is done client-side since the server deliberately keeps it untyped.
 */
export function PageRenderer({ sections }: PageRendererProps) {
    if (!Array.isArray(sections)) {
        return null;
    }

    return (
        <div>
            {(sections as PageSection[]).map((section, index) => {
                switch (section.type) {
                    case 'hero':
                        return <HeroSectionRenderer key={index} section={section} />;
                    case 'richText':
                        return <RichTextSectionRenderer key={index} section={section} />;
                    case 'productGrid':
                        return <ProductGridSectionRenderer key={index} section={section} />;
                    case 'articleGrid':
                        return <ArticleGridSectionRenderer key={index} section={section} />;
                    case 'bannerSlot':
                        return <BannerSlotSectionRenderer key={index} section={section} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
}
