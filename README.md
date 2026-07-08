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

See `.env.example` for additional, less commonly needed overrides (public URL/channel variants for client-side use, custom header names).

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Architecture

### Multi-Tenancy (Channel Resolution)

This storefront serves multiple academies from a single deployment. Each academy is a Vendure **Channel**, identified by a channel token, and the storefront never trusts a channel token that didn't come from its own reverse proxy.

**Request flow for a custom-domain academy:**

1. Browser requests `https://academy-a.example.com/...`
2. The reverse proxy (nginx or a Cloudflare Worker) sits in front of Next.js and:
   - resolves the hostname by calling `GET /api/resolve-channel?hostname=academy-a.example.com`
   - **strips** any `x-saa9vi-channel-token` header the client may have sent (trust boundary — see [Deployment](#deployment))
   - sets the resolved token as `x-saa9vi-channel-token` on the request it forwards to Next.js
3. Next.js reads that header in `lib/vendure/api.ts` and scopes every Vendure Shop API call — and every cache tag — to that channel.

**Channel token resolution priority** (in `src/lib/vendure/api.ts`):
1. Explicit `channelToken` argument passed to `query()` (used by cached functions — see below)
2. `x-saa9vi-channel-token` header set by the reverse proxy (production multi-tenancy)
3. `VENDURE_CHANNEL_TOKEN` env var (local dev / preview deployments with no custom domain)

### Caching Strategy (Next.js 16 `'use cache'`)

All data-fetching functions use Next.js 16's `'use cache'` directive with explicit `cacheTag()` for granular revalidation. The channel token is a required dimension in every cache tag, so cached data can never leak across tenants.

`'use cache'` functions can't call `next/headers()` (a Next.js 16 constraint), so the channel token has to be resolved *before* entering the cached scope, then passed in as a plain argument:

```ts
// Dynamic outer function — resolves the per-request channel token
export async function Page() {
    const channelToken = (await getChannelTokenFromHeaders()) || getChannelToken();
    return CachedInner(channelToken);
}

// Cached inner function — never calls next/headers() itself
async function CachedInner(channelToken: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`page-${locale}-${channelToken}`);
    return query(Query, { ... }, { channelToken });
}
```

This split is applied consistently across every cached data-fetching function in the codebase — product and collection pages, featured/related product rails, and the footer/navbar collection lists. When adding a new cached function that needs channel-scoped data, follow the same pattern rather than resolving the token inside the `'use cache'` scope.

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

   This header-stripping step is the whole trust model — without it, a request that reaches the Next.js origin directly (bypassing the proxy) can set its own `x-saa9vi-channel-token` and be served as any tenant. The proxy config for this hasn't been written yet; see [Known Limitations](#known-limitations).

2. **Redis** must be populated with hostname→channelToken mappings:
   ```
   SET channel-token:academy-a.example.com academy-a-token
   SET channel-token:academy-b.example.com academy-b-token
   ```

3. **Environment** must configure `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`.

### Vercel Deployment

The easiest way to deploy is the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

> **Note:** For multi-tenancy on Vercel, the reverse-proxy layer must be handled by Cloudflare (or similar) in front of Vercel, since Vercel's Edge Network doesn't support custom nginx configuration.

## Known Limitations

- **`getActiveChannelCached()` / `getAvailableCountriesCached()`** (`lib/vendure/cached.ts`) still resolve their channel token from the env-var fallback rather than the per-request header. Needs the same dynamic-outer/cached-inner split already used for product, collection, and layout data.
- **`cart.tsx`'s `'use cache: private'` block** tags only with `cacheTag('cart')` — no channel dimension. Lower risk than the items above since private cache scope is already per-user, but should be aligned with the rest of the caching strategy for consistency.
- **The reverse-proxy config** (nginx or a Cloudflare Worker) that calls `/api/resolve-channel` and enforces the client-header-stripping trust boundary described in [Deployment](#deployment) doesn't exist yet in this repo. This codebase implements its side of the contract and assumes the header arrives pre-verified; the proxy itself is external infrastructure that still needs to be written and deployed.

Update this list as items are resolved — it's meant to track real open work, not a historical record.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js features and API
- [Vendure Documentation](https://docs.vendure.io) — learn about Vendure e-commerce framework
- [next-intl Documentation](https://next-intl.dev) — internationalization for Next.js
- [gql.tada Documentation](https://gql-tada.0no.co) — GraphQL type-safe documents
