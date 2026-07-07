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
A customized Next.js 16 storefront built on Vendure headless commerce, featuring BBB integration, marketplace, and learning dashboard.
</p>
<h4 align="center">
  <a href="https://saa9vi.com">Website</a> |
  <a href="https://docs.vendure.io">Vendure Documentation</a>
</h4>

## Features

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

First, set up the environment variables:

```bash
cp .env.example .env
```

The `.env` file should contain:
```
VENDURE_SHOP_API_URL=http://localhost:3000/shop-api
VENDURE_CHANNEL_TOKEN=__default_channel__
NEXT_PUBLIC_SITE_URL=http://localhost:3001
REVALIDATION_SECRET=your-secure-random-string-here
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## Project Structure

```
src/
├── app/[locale]/           # Main Next.js app with internationalization
│   ├── account/           # Customer account pages
│   │   └── learning/      # Learning dashboard for enrolled courses
│   ├── marketplace/       # Course marketplace across academies
│   ├── instructor/[slug]/   # Instructor profile pages
│   └── ...
├── lib/vendure/           # Vendure API client utilities
├── components/            # React components
└── i18n/                # Internationalization setup
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Vendure Documentation](https://docs.vendure.io) - learn about Vendure e-commerce framework.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
