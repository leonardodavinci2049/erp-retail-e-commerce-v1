# Project: Next.js 16 E-commerce (Mundial Megastore)

## Tech Stack & Commands

- **Next.js 16** (App Router), **React 19**, **TypeScript 6**, **Tailwind CSS 4**, **Biome 2** (linter/format), **Zod 4**
- **Package manager**: pnpm (pnpm-lock.yaml present)

## Build and Development Commands

- `pnpm install` installs locked dependencies with pnpm 11.
- `pnpm dev` starts Next.js and loads `.env` through `dotenv-cli`.
- `pnpm build` creates and validates the production build.
- `pnpm start` serves that build using `.env`.
- `pnpm lint` checks the repository with Biome; `pnpm format` formats it.
- `pnpm exec tsc --noEmit` runs strict TypeScript checking.

## Architecture

- **Frontend-only app** consuming data from external NestJS APIs
- External APIs:

## Routing

- App Router with route groups:
  - `(home)` — Home page (`page.tsx`, `actions.ts`, `_components/`)
  - `(catalog)` — Catalog (shared `layout.tsx`):
    - `/products` — Product listing
    - `/product/[...slug]` — Product detail
    - `/category/[...slug]` — Category page (has `not-found.tsx`)
  - `(company)` — Company pages (shared `layout.tsx` with CompanyHeader/Footer/Logo, own `error.tsx` + `loading.tsx`):
    - `/about`, `/antispam`, `/contact`, `/privacy`, `/return`, `/terms`
  - `(sitemaps)` — 7 sitemap routes: `sitemap.xml`, `sitemap-categories.xml`, `sitemap-products-{0..3}.xml`, `sitemap-static.xml`
- Root files: `src/app/layout.tsx`, `not-found.tsx`, `robots.ts`
- Path alias: `@/*` resolves to `./src/*` (configured in tsconfig.json)

## Caching (Next.js 16 `use cache`)

- Cached services use `"use cache"` directive with `cacheLife` profiles and `cacheTag` invalidation
- Cache profiles (defined in `next.config.ts`):
  - `hours` (stale: 10min, revalidate: 2min, expire: 10min) — navigation
  - `quarter` (stale: 15min, revalidate: 5min, expire: 15min) — categories menu
  - `frequent` (stale: 5min, revalidate: 1min, expire: 5min) — products
  - `daily` (stale: 24h, revalidate: 1h, expire: 24h) — footer, static content
- Cache tags (defined in `src/lib/cache-config.ts`): `product(id)`, `productGallery(id)`, `category(id)`, `products`, `categories`, `navigation`, `banners`, `footer`
- Connection errors during build are expected/suppressed (API may be unavailable)
- **Mixed pattern**: `src/app/(home)/actions.ts` combines `"use server"` with `"use cache"` inside `fetchSectionProducts` (uses `cacheLife("frequent")` and `cacheTag(CACHE_TAGS.products)`)

## Styling & Components

- **Tailwind CSS 4** via `@tailwindcss/postcss` (no tailwind.config.js — Tailwind 4 syntax)
  - `@import "tailwindcss"` + `@import "tw-animate-css"` in globals.css
  - Uses **oklch** color space for theme colors (not hsl)
  - Dark mode via `@custom-variant dark (&:is(.dark *))`
  - CSS declares fonts `Inter` / `Playfair Display` / `Roboto Mono`, but `layout.tsx` loads **Geist** and **Geist_Mono** via `next/font/google` — the CSS vars are unused overrides from shadcn scaffolding
- **shadcn/ui** configured in `components.json` (style: "new-york", RSC: true, base color: "stone", icons: lucide)
- **Biome** configuration (`biome.json`):
  - 2-space indentation, space style
  - Recommended rules + Next.js + React domains
  - `noUnknownAtRules` off (for Tailwind)
  - Auto organize imports via assist

## SEO

- Dynamic sitemaps in `src/app/(sitemaps)/` (7 route files)
- `robots.ts` in `src/app/`
- JSON-LD components in `src/components/seo/`: `OrganizationJsonLd`, `WebSiteJsonLd`, `LocalBusinessJsonLd`
- Product-level JSON-LD: `ProductJsonLd` (in `src/app/(catalog)/product/_components/`)
- Google Analytics via `src/components/analytics/GoogleAnalytics.tsx` (env: NEXT_PUBLIC_GA_MEASUREMENT_ID)
- GA4 events in `src/components/analytics/events.ts`

## Types (`src/types/`)

- `product.ts` — canonical types including `ProductWithMetadata` (use this as the main product type)
- `cart.ts` — `CartItem`, `PaymentMethod` ("PIX" | "Cartão" | "Dinheiro"), `CartState`, `CartActions`, `CartStore`
- `types.ts` — `Brand`, `FilterOptions`, `SortOption`, `ViewMode`, legacy duplicates of `Product`/`Category`
- `home-type.ts`, `home.ts` — home page types, also have legacy `Product` duplicates
- `api-assets.ts` — `FileAsset`, `FileVersion`, `FileUrls`, etc.
- `account.ts` — `Customer`, `Order`, `DashboardStat`, `QuickAction`, `SalesConsultant`
- **Warning**: There are 3 separate `Product` interfaces across `product.ts`, `types.ts`, `home.ts` with different shapes — always use **`ProductWithMetadata`** from `product.ts`
- **Note**: `home-type copy.ts` is a stale duplicate — do not use

## Important Constraints

- **Server-only imports**: Most services in `src/services/api-main/` use `import "server-only"` — exception: `brand-service-api.ts` lacks it
- **Assets API service** (`src/services/api-assets/assets-api-service.ts`) uses native `fetch` (not Axios) and does NOT have `import "server-only"`; the cached layer (`gallery-cached-service.ts`) does have it
- **Client data fetching must go through API routes or Server Actions** (to avoid exposing API keys)
- **Product slug format**: `{product-name}-{id}` (ID extracted from last segment after last `-`)
- **Category system**: Uses `TAXONOMY_ENDPOINTS` (15 endpoints in `api-constants.ts`). `CATEGORY_ENDPOINTS` is legacy — prefer taxonomy
- **Category menu type ID**: 1 (hierarchical menu), parent_id: 0 (root)
- **Brazilian locale**: app uses `pt-BR`, prices in BRL, addresses via CEP lookup. `src/core/constants/brazilian-states.ts` has all states with IBGE codes
- **No middleware.ts** — there is no Next.js middleware file in this project
