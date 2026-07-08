<p align="center">
  <a href="https://vendure.io">
    <img alt="Vendure logo" height="60" width="auto" src="https://a.storyblok.com/f/328257/699x480/8dbb4c7a3c/logo-icon.png/m/0x80">
  </a>
</p>
<h1 align="center">
  Saa9vi Academy Storefront
</h1>
<h3 align="center">
    A Next.js 16 storefront for Saa9vi Academy Platform
</h3>
<p align="center">
A multi-tenant Next.js 16 storefront built on Vendure headless commerce, featuring BBB integration, marketplace, and learning dashboard.
</p>
<h4 align="center">
  <a href="https://saa9vi.com">Website</a> |
  <a href="https://docs.vendure.io">Vendure Documentation</a>
</h4>

## Features

**Multi-Tenancy**
- Channel-per-academy isolation via `x-saa9vi-channel-token` header
- Hostname-based channel resolution via `/api/resolve-channel` (Redis-backed)
- Reverse-proxy trust model: nginx/Cloudflare Worker sets the header, client-supplied values are stripped
- Per-tenant cache tags for product, collection, and layout data

**Authentication & Accounts**
- Customer registration with email verification
- Login/logout with session management
- Password reset & change password
- Email address updates with verification

**Customer Account**
- Profile management (name, email, password)
- Address management (create, update, delete, set default)
- Order history with pagination & detailed order views
- **Learning Dashboard** - View enrolled courses and join live sessions

**Product Browsing**
- Collections & featured products
- Product detail pages with variants & galleries
- Full-text search with faceted filtering
- Pagination & sorting

**Marketplace**
- Browse courses and instructors across academies
- Academy-specific subdomains (e.g., `academy.saa9vi.com`)
- Sponsored session highlighting

**BigBlueButton Integration**
- Join live virtual classrooms
- Session scheduling and enrollment
- Real-time meeting links

**Shopping Cart**
- Add/remove items, adjust quantities
- Promotion code support
- Real-time cart updates with totals

**Checkout**
- Multi-step flow: shipping address, delivery method, payment, review
- Saved address selection
- Shipping method selection
- Payment integration

**Order Management**
- Order confirmation page
- Order tracking with status
- Detailed order information

**Internationalization**
- Multi-language support via next-intl (English & German out of the box)
- Multi-currency support with persistent currency selection
- Locale-aware price formatting

## Getting Started

### Prerequisites

- Node.js 20+
- A running Vendure backend (see [saa9vi.com](https://saa9vi.com) for the platform repo)
- Redis (optional, for custom-domain channel resolution)

### Environment Setup

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VENDURE_SHOP_API_URL` | Yes | — | Vendure Shop API endpoint |
| `VENDURE_CHANNEL_TOKEN` | No | `__default_channel__` | Fallback channel token (local dev) |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3001` | Site URL for SEO/metadata |
| `REVALIDATION_SECRET` | Yes | — | Secret for `/api/revalidate` endpoint |
| `REDIS_HOST` | No | `localhost` | Redis host for channel resolution |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | — | Redis password |

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Architecture

### Multi-Tenancy (Channel Resolution)

This storefront serves multiple academies from a single deployment. Each academy is a Vendure **Channel**, identified by a channel token.

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Browser     │────▶│  nginx/CF Worker │────▶│  Next.js     │
│              │     │                  │     │  Storefront  │
│ Host:        │     │ 1. Resolve       │     │              │
│ academy-a    │     │    hostname via   │     │  x-saa9vi-   │
│ .example.com │     │    /api/resolve-  │     │  channel-    │
│              │     │    channel        │     │  token header │
└─────────────┘     │ 2. Strip client   │     │  → query()   │
                    │    header          │     │  uses it     │
                    │ 3. Set resolved    │     └──────┬───────┘
                    │    header          │            │
                    └──────────────────┘     ┌───────┴────────┐
                                             │  Vendure API   │
                                             │  (channel-     │
                                             │   scoped data) │
                                             └────────────────┘
```

**Channel token resolution priority** (in `src/lib/vendure/api.ts`):
1. Explicit `channelToken` option passed to `query()` (used by cached functions)
2. `x-saa9vi-channel-token` header set by reverse proxy (production multi-tenancy)
3. `VENDURE_CHANNEL_TOKEN` env var (local dev / preview deployments)

### Caching Strategy (Next.js 16 `'use cache'`)

All data-fetching functions use Next.js 16's `'use cache'` directive with explicit `cacheTag()` for granular revalidation. The channel token is a required dimension in every cache tag to prevent cross-tenant cache leaks.

**Pattern** (applied consistently across all 7 cached call sites):

```ts
// Dynamic outer function — resolves per-request channel token
export async function Page() {
    const channelToken = (await getChannelTokenFromHeaders()) || getChannelToken();
    return CachedInner(channelToken);
}

// Cached inner function — never calls next/headers()
async function CachedInner(channelToken: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`page-${locale}-${channelToken}`);
    return query(Query, { ... }, { channelToken });
}
```

This split is required because `'use cache'` functions cannot call `next/headers()` (Next.js 16 constraint). The channel token must be resolved in the dynamic outer scope and passed as a plain argument.

### Project Structure

```
src/
├── app/
│   ├── [locale]/              # Internationalized routes
│   │   ├── account/           # Customer account pages
│   │   │   └── learning/      # Learning dashboard for enrolled courses
│   │   ├── marketplace/       # Course marketplace across academies
│   │   ├── instructor/[slug]/ # Instructor profile pages
│   │   ├── product/[slug]/    # Product detail (cached, channel-scoped)
│   │   ├── collection/[slug]/ # Collection listing (cached, channel-scoped)
│   │   ├── search/            # Full-text search
│   │   ├── cart/              # Shopping cart
│   │   ├── checkout/          # Multi-step checkout
│   │   └── ...                # Auth pages (register, sign-in, etc.)
│   └── api/
│       ├── resolve-channel/   # Redis-backed hostname→channel resolution
│       └── revalidate/        # On-demand cache revalidation
├── lib/
│   └── vendure/
│       ├── api.ts             # GraphQL client with channel resolution
│       ├── channel.ts         # Synchronous env-var fallback (safe in 'use cache')
│       ├── cached.ts          # Non-cached channel-scoped queries
│       ├── queries.ts         # GraphQL query definitions
│       ├── mutations.ts       # GraphQL mutation definitions
│       ├── fragments.ts       # gql.tada fragment definitions
│       ├── actions.ts         # Server actions
│       └── session-cta.ts     # Session CTA helper (INV-008 isolation)
├── components/
│   ├── commerce/              # Product, cart, checkout components
│   ├── layout/                # Navbar, footer (both channel-scoped)
│   ├── cms/                   # CMS page renderer
│   ├── account/               # Account-related components
│   ├── shared/                # Shared UI components
│   └── ui/                    # shadcn/ui primitives
└── i18n/                      # next-intl internationalization
```

## API Routes

### `GET /api/resolve-channel?hostname=...`

Resolves a custom domain to a Vendure channel token via Redis. Returns `{ channelToken: string | null }`.

- Called by the reverse proxy (nginx/Cloudflare Worker), not by the browser
- Returns `null` for localhost/IP addresses (dev mode)
- Falls back to `null` if Redis is unavailable
- Key format: `channel-token:{hostname}`

### `POST /api/revalidate`

On-demand cache revalidation. Called by Vendure webhooks when data changes.

## Deployment

### Production Multi-Tenancy Setup

1. **Reverse proxy** (nginx/Cloudflare Worker) must:
   - Resolve the incoming hostname via `GET /api/resolve-channel?hostname=...`
   - Strip any client-supplied `x-saa9vi-channel-token` header
   - Set the resolved `x-saa9vi-channel-token` header on the upstream request

2. **Redis** must be populated with hostname→channelToken mappings:
   ```
   SET channel-token:academy-a.example.com academy-a-token
   SET channel-token:academy-b.example.com academy-b-token
   ```

3. **Environment** must configure `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`.

### Vercel Deployment

The easiest way to deploy is the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

> **Note:** For multi-tenancy on Vercel, the reverse-proxy layer must be handled by Cloudflare (or similar) in front of Vercel, since Vercel's Edge Network doesn't support custom nginx configuration.

## Assessment Notes

### Multi-Tenancy Channel Resolution — Implementation Review

The core fix for multi-tenancy is correct: resolve the real per-request channel token in the **outer, dynamic** part of each page/component (where `next/headers()` is legal), then pass it down as a plain argument into the `'use cache'` function, which never resolves anything itself. This satisfies Next.js 16's constraint that `'use cache'` functions cannot call `next/headers()`.

**What was fixed:**
- All 7 cached call sites (`product`, `collection` ×2 functions, `featured-products`, `related-products`, `footer`, `mobile-nav-wrapper`, `navbar-collections`) now pass the header-resolved channel token as an explicit parameter
- Cache tags include the real channel token, preventing cross-tenant cache leaks
- `getChannelToken()` is correctly demoted to the local-dev/no-header fallback
- The `Footer`/`MobileNavWrapper`/`NavbarCollections` split into a thin dynamic outer function wrapping a `'use cache'`-tagged inner function is a legitimate Next.js 16 composition pattern

**Known stragglers (lower priority):**
- `getActiveChannelCached()` / `getAvailableCountriesCached()` in `cached.ts` still default to the env var — same mechanical fix, less visible impact per-tenant
- `cart.tsx`'s `'use cache: private'` block tags with just `cacheTag('cart')`, no channel dimension — private scope limits blast radius
- The nginx/Cloudflare Worker config that calls `/api/resolve-channel` and strips client-supplied headers is infrastructure-as-comment, not yet written

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js features and API
- [Vendure Documentation](https://docs.vendure.io) — learn about Vendure e-commerce framework
- [next-intl Documentation](https://next-intl.dev) — internationalization for Next.js
- [gql.tada Documentation](https://gql-tada.0no.co) — GraphQL type-safe documents
