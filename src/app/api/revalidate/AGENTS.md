# Cache Revalidation Endpoint

Use these instructions when changing or integrating the revalidation endpoint
in this directory. Keep this guidance aligned with [`route.ts`](./route.ts),
[`revalidation-contract.ts`](../../../lib/revalidation-contract.ts),
[`cache-config.ts`](../../../lib/cache-config.ts) and
[`envs.ts`](../../../core/config/envs.ts).

## Endpoint contract

- There is one receiver URL: `POST <STORE_BASE_URL>/api/revalidate`. The module
  and scope are selected in the JSON body; do not create a separate URL for
  each cache scope.
- Send `Content-Type: application/json` and the `x-revalidate-secret` header.
  Its value must match the receiver's `REVALIDATE_SECRET`.
- `REVALIDATE_SECRET` is required and validated in
  `src/core/config/envs.ts`. Keep it in server-side configuration. Never put it
  in a URL, browser request, response, source control, or logs.
- New callers must send an explicit JSON object with `module` and `scope`. The
  receiver accepts a blank body for legacy `app-config/all` behavior, but do
  not use that compatibility behavior in new integrations.

## Primary operations

The backend usually needs only these three payloads. They all target the same
receiver URL.

| Need | Payload | Invalidated tags |
| --- | --- | --- |
| Clear all configuration caches | `{"module":"app-config","scope":"configs"}` | `app-configs` |
| Clear product and image gallery caches | `{"module":"products","scope":"all"}` | `products`, `product-galleries` |
| Clear the category menu cache | `{"module":"taxonomy","scope":"taxonomy-menu"}` | `categories`, `navigation` |

`app-config/all` is a superset of `configs` and also clears application menus.
In this project the product caches are collective: `products/all` and almost
every `products` scope clear listings, sections, details and related products
at once. Taxonomy scopes are also collective because every taxonomy entry is
tagged with `categories`.

## Accepted payloads

Only the `app-config`, `products` and `taxonomy` modules are accepted.

`app-config` accepts these scopes:

```json
{"module":"app-config","scope":"configs"}
{"module":"app-config","scope":"menus"}
{"module":"app-config","scope":"all"}
```

`products` accepts these scopes:

```json
{"module":"products","scope":"all"}
{"module":"products","scope":"product-list"}
{"module":"products","scope":"product-sections"}
{"module":"products","scope":"product-detail"}
{"module":"products","scope":"product-detail","productId":123}
{"module":"products","scope":"product-detail","productSlug":"product-slug"}
{"module":"products","scope":"product-detail","productId":123,"productSlug":"product-slug"}
```

`taxonomy` accepts these scopes:

```json
{"module":"taxonomy","scope":"all"}
{"module":"taxonomy","scope":"taxonomy-menu"}
{"module":"taxonomy","scope":"taxonomy-details"}
{"module":"taxonomy","scope":"taxonomy-details","taxonomyId":3055}
```

`productId` and `productSlug` are valid only with `product-detail`. `taxonomyId`
is valid only with `taxonomy-details`. IDs must be positive integers; slugs must
be non-empty after trimming and no longer than 255 characters. The schema is
strict: it rejects extra fields, arrays of scopes, arbitrary cache tags, and
identifiers supplied with `scope: "all"`.

## Configuration cache (`app-config`)

Controls `src/services/api-main/app-config/app-config-cached-service.ts`. The
tag values come from `CACHE_TAGS` in `src/lib/cache-config.ts`.

| Scope | Invalidated tags | Covered reads |
| --- | --- | --- |
| `configs` | `app-configs` | All configuration listings and by-ID reads |
| `menus` | `app-menus` | Application menus by type |
| `all` | `app-configs`, `app-menus` | Both groups |

Instructions:

- Send the webhook only after the configuration or menu write is confirmed.
- Use `configs` for application settings and `menus` for application navigation
  menus. Use `all` only when both groups changed in the same operation.
- Configuration entries are tagged collectively, including by-ID reads
  (`app-config-<id>`), so there is no per-configuration payload. The same
  applies to menus by type (`app-menu-type-<type>`).
- Application menus are not category menus. Category changes belong to the
  `taxonomy` module below.

## Product and image gallery cache (`products`)

Controls `src/services/api-main/product/product-web-cached-service.ts` and
`src/services/api-assets/gallery-cached-service.ts`.

| Scope | Invalidated tags | Covered reads |
| --- | --- | --- |
| `product-list` | `products` | Public listings, including search, filters, and pagination |
| `product-sections` | `products` | Home product sections |
| `product-detail` without identifiers | `products`, `product-galleries` | All public details and all galleries |
| `product-detail` with `productId` | `products`, `product-<id>`, `product-gallery-<id>` | Public details plus that product's gallery |
| `product-detail` with `productSlug` | `products`, `product-galleries` | Public details and all galleries |
| `product-detail` with both | `products`, `product-<id>`, `product-gallery-<id>` | Public details plus that product's gallery |
| `all` | `products`, `product-galleries` | Every public read in this module and every product gallery |

Instructions:

- Listings, sections, details, related products, and category product listings
  all share the `products` tag. Any scope that returns `products` refreshes all
  of them; there is no narrower detail-only invalidation in this project.
- Use `product-detail` with `productId` for secondary gallery images only. The
  optional `productId` narrows the gallery tag (`product-gallery-<id>`); it does
  not narrow the product detail caches.
- This project has no dedicated product slug tag. With only `productSlug`, the
  receiver expires `product-galleries`, which affects every product. Send
  `productId` whenever the caller knows it.
- Use `all` after price, stock, or primary-image changes, because those changes
  can affect listings, details, galleries, and home sections.
- `products/all` does not invalidate taxonomy or configuration caches.
- Authenticated product reads do not use the shared public cache and are not
  affected by this module. The gallery cache is still shared and is invalidated.

## Category taxonomy cache (`taxonomy`)

Controls `src/services/api-main/category/category-web-cached-service.ts`.

| Scope | Invalidated tags | Covered reads |
| --- | --- | --- |
| `taxonomy-menu` | `categories`, `navigation` | Public category menu used by the header, catalog, and home |
| `taxonomy-details` without `taxonomyId` | `categories` | All taxonomy entries |
| `taxonomy-details` with `taxonomyId` | `categories`, `category-<id>` | All taxonomy entries |
| `all` | `categories`, `navigation` | Menu and all taxonomy entries |

Instructions:

- Every taxonomy read is tagged with `categories`, including menu, slug lookups
  (`getCategoryBySlug`), and details cached by ID or slug. Because the category
  detail route resolves primarily by slug, a targeted `category-<id>` tag alone
  would leave the slug entry stale; the endpoint therefore always includes
  `categories` for `taxonomy-details`.
- `taxonomy-menu` also includes `navigation`, which is used only by the menu.
  Revalidating `categories` clears the menu, slug lookups and details as well.
- Use `taxonomy-menu` when the category tree, names, order, or visibility change
  and the header/catalog menu must refresh.
- `taxonomy/all` does not invalidate products. When the same operation also
  changes product listing content, send a separate `products` request.
- There is no `taxonomy-base` cached service in this project; do not reference
  one when documenting webhook behavior.

## Global invalidation behavior

- The endpoint uses `revalidateTag(tag, { expire: 0 })`. The next read is a
  blocking cache miss, but a successful response does not prove that reload,
  delivery between applications, or propagation across all production instances
  succeeded.
- A revalidation is triggered by a later request, not by the webhook call
  itself. Open browser tabs are not refreshed automatically.
- The webhook does not clear browser, CDN, or image optimization caches. Prefer
  a new URL when replacing the content of an asset.

## Sender and failure handling

- The application that confirms the data mutation should send the webhook after
  its write succeeds. Calling `revalidatePath` in the sender does not invalidate
  this storefront's cache.
- Treat HTTP `200` with `revalidated: true` as the receiver's confirmation that
  tags were invalidated. A `400` indicates an invalid JSON body or payload; a
  `401` indicates a missing or mismatched secret.
- For network errors, timeouts, or `5xx`, retry the notification with
  increasing delays. Do not repeat the underlying business mutation when
  retrying a revalidation request. The receiver has no event deduplication or
  persistent delivery history.
- Do not claim that the webhook updates already-open browser tabs, invalidates
  browser/CDN image caches, repairs data inconsistencies, or confirms a later
  read. Those behaviors are outside this endpoint's contract.
- The local verification script lives in `scripts-local/revalidate-check.mjs`;
  that directory is gitignored and its expected tags must be updated whenever
  the mapping in `route.ts` changes.
