# Cache Revalidation Endpoint

Use these instructions when changing or integrating the revalidation endpoint
in this directory. Keep this guidance aligned with [`route.ts`](./route.ts),
[`revalidation-contract.ts`](../../../lib/revalidation-contract.ts), and, when
available, the [integration guide](../../../../docs/webhooks/revalidation-integration-guide.md).

## Endpoint contract

- There is one receiver URL: `POST <STORE_BASE_URL>/api/revalidate`. The module
  and scope are selected in the JSON body; do not create a separate URL for
  each cache scope.
- Send `Content-Type: application/json` and the `x-revalidate-secret` header.
  Its value must match the receiver's `REVALIDATE_SECRET`.
- Keep the secret in server-side configuration. Never put it in a URL, browser
  request, response, source control, or logs.
- New callers must send an explicit JSON object with `module` and `scope`. The
  receiver accepts a blank body for legacy `app-config/all` behavior, but do
  not use that compatibility behavior in new integrations.

## Primary operations

The backend usually needs only these three payloads. They all target the same
receiver URL.

| Need | Payload | Invalidated tags |
| --- | --- | --- |
| Clear all configuration caches | `{"module":"app-config","scope":"configs"}` | `app-configs` |
| Clear product and image gallery caches | `{"module":"products","scope":"all"}` | `product-wholesale-list`, `product-wholesale-details`, `product-galleries`, `product-wholesale-sections` |
| Clear the category menu cache | `{"module":"taxonomy","scope":"taxonomy-menu"}` | `product-wholesale-taxonomy-menu` |

`app-config/all` is a superset of `configs` and also clears application menus.
`products/all` also clears the home product sections. Neither of them reaches
the category taxonomy cache, and `taxonomy/taxonomy-menu` does not reach
products.

## Accepted payloads

The former `product-wholesale` module is not accepted.

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
strict: reject extra fields, arrays of scopes, arbitrary cache tags, and
identifiers supplied with `scope: "all"`.

## Configuration cache (`app-config`)

Controls `src/services/api-main/app-config/app-config-cached-service.ts`.

| Scope | Invalidated tags | Covered reads |
| --- | --- | --- |
| `configs` | `app-configs` | All configuration listings and by-ID reads |
| `menus` | `app-menus` | Application menus by type |
| `all` | `app-configs`, `app-menus` | Both groups |

Instructions:

- Send the webhook only after the configuration or menu write is confirmed.
- Use `configs` for application settings and `menus` for application navigation
  menus. Use `all` only when both groups changed in the same operation.
- Configuration entries are tagged collectively, including by-ID reads, so
  there is no per-configuration payload. The same applies to menus by type.
- Application menus are not category menus. Category changes belong to the
  `taxonomy` module below.

## Product and image gallery cache (`products`)

Controls `src/services/api-main/product-wholesale/product-wholesale-cached-service.ts`
and `src/services/api-assets/gallery-cached-service.ts`.

| Scope | Invalidated tags | Covered reads |
| --- | --- | --- |
| `product-list` | `product-wholesale-list` | Public listings, including search, filters, and pagination |
| `product-sections` | `product-wholesale-sections` | Public product sections, such as the home sections |
| `product-detail` without identifiers | `product-wholesale-details`, `product-galleries` | All public details and all galleries |
| `product-detail` with `productId` | `product-wholesale-product-<id>`, `product-gallery-<id>` | Detail cached by ID and that product's gallery |
| `product-detail` with `productSlug` | `product-wholesale-product-<slug>`, `product-galleries` | Detail cached by slug and all galleries |
| `product-detail` with both | Both detail tags and `product-gallery-<id>` | Both detail entries and that product's gallery |
| `all` | `product-wholesale-list`, `product-wholesale-details`, `product-galleries`, `product-wholesale-sections` | Every public read in this module and every product gallery |

Instructions:

- Use `all` after price, stock, or primary-image changes, because those changes
  can affect listings, details, galleries, and home sections.
- Use `product-detail` with `productId` for secondary gallery images only. Add
  `productSlug` whenever the product can also be read by slug, since the two
  detail entries use different tags.
- `productId` is the only way to invalidate a single gallery. With only
  `productSlug`, the receiver cannot resolve the ID and expires
  `product-galleries`, which affects every product.
- Send the slug exactly as it appears in `/product/<slug>`. The contract trims
  whitespace but does not normalize case or accents, and tags are case-sensitive.
- `products/all` does not invalidate taxonomy or configuration caches.
- Authenticated product reads do not use the shared public cache and are not
  affected by this module. The gallery cache is still shared and is invalidated.

## Category taxonomy cache (`taxonomy`)

Controls the public taxonomy menu and taxonomy detail caches in
`product-wholesale-cached-service.ts`.

| Scope | Invalidated tags | Covered reads |
| --- | --- | --- |
| `taxonomy-menu` | `product-wholesale-taxonomy-menu` | Public category menu used by the header, catalog, and home |
| `taxonomy-details` without `taxonomyId` | `product-wholesale-taxonomy-details` | All public taxonomy details |
| `taxonomy-details` with `taxonomyId` | `product-wholesale-taxonomy-<id>` | That taxonomy's detail entry |
| `all` | `product-wholesale-taxonomy-menu`, `product-wholesale-taxonomy-details` | Menu and all taxonomy details |

Instructions:

- Use `taxonomy-menu` when the category tree, names, order, or visibility change
  and the header/catalog menu must refresh.
- Use `taxonomy-details` with `taxonomyId` when only one category's metadata
  changed. Omit `taxonomyId` only when many categories changed at once.
- `taxonomy/all` does not invalidate products. When the same operation also
  changes product listing content, send a separate `products` request.
- The storefront menu is cached by the `product-wholesale` module. The cached
  menu still present in `src/services/api-main/taxonomy-base/taxonomy-base-cached-service.ts`
  uses different tags and is not wired to this scope; do not rely on it for
  webhook invalidation without aligning its tags first.

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

For additional operation mapping and integration context, consult the local
[revalidation integration guide](../../../../docs/webhooks/revalidation-integration-guide.md)
when it is available.
