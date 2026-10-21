import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { envs } from "@/core/config/envs";
import { CACHE_TAGS } from "@/lib/cache-config";
import {
  LEGACY_REVALIDATION_REQUEST,
  type RevalidationRequest,
  revalidationRequestSchema,
} from "@/lib/revalidation-contract";

function isAuthorized(request: Request): boolean {
  const expectedSecret = envs.REVALIDATE_SECRET;
  const providedSecret = request.headers.get("x-revalidate-secret");

  if (!expectedSecret || !providedSecret) {
    return false;
  }

  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(expectedSecret);

  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

async function parseRequest(
  request: Request,
): Promise<
  | { success: true; data: RevalidationRequest }
  | { success: false; response: Response }
> {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return { success: true, data: LEGACY_REVALIDATION_REQUEST };
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return {
      success: false,
      response: Response.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      ),
    };
  }

  const parsed = revalidationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      response: Response.json(
        {
          error: "Invalid revalidation request",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      ),
    };
  }

  return { success: true, data: parsed.data };
}

type AppConfigRequest = Extract<RevalidationRequest, { module: "app-config" }>;
type ProductsRequest = Extract<RevalidationRequest, { module: "products" }>;
type TaxonomyRequest = Extract<RevalidationRequest, { module: "taxonomy" }>;

const APP_CONFIG_ALL_TAGS = [CACHE_TAGS.appConfigs, CACHE_TAGS.appMenus];
const TAXONOMY_ALL_TAGS = [CACHE_TAGS.categories, CACHE_TAGS.navigation];
const PRODUCTS_ALL_TAGS = [CACHE_TAGS.products, CACHE_TAGS.productGalleries];

function getAppConfigTags(request: AppConfigRequest): string[] {
  switch (request.scope) {
    case "configs":
      return [CACHE_TAGS.appConfigs];
    case "menus":
      return [CACHE_TAGS.appMenus];
    case "all":
      return APP_CONFIG_ALL_TAGS;
  }
}

/**
 * Every taxonomy read in this project is tagged with `categories`, including
 * menu, slug lookups and details cached by ID or slug. A targeted detail
 * request therefore also expires the collective tag; otherwise entries cached
 * by slug (the primary category route) would stay stale after an ID-only
 * revalidation.
 */
function getTaxonomyTags(request: TaxonomyRequest): string[] {
  switch (request.scope) {
    case "taxonomy-menu":
      return [CACHE_TAGS.categories, CACHE_TAGS.navigation];
    case "taxonomy-details":
      return request.taxonomyId === undefined
        ? [CACHE_TAGS.categories]
        : [
            CACHE_TAGS.categories,
            CACHE_TAGS.category(String(request.taxonomyId)),
          ];
    case "all":
      return TAXONOMY_ALL_TAGS;
  }
}

/**
 * Listings, sections, details and related products all share the `products`
 * tag, so any detail request also expires the public product caches. This
 * project has no dedicated slug tag: only the gallery tag can be narrowed by
 * `productId`.
 */
function getProductDetailTags(request: ProductsRequest): string[] {
  const tags: string[] = [CACHE_TAGS.products];

  if (request.productId !== undefined) {
    tags.push(CACHE_TAGS.product(String(request.productId)));
    tags.push(CACHE_TAGS.productGallery(String(request.productId)));
  } else {
    tags.push(CACHE_TAGS.productGalleries);
  }

  return tags;
}

function getProductsTags(request: ProductsRequest): string[] {
  switch (request.scope) {
    case "product-list":
    case "product-sections":
      return [CACHE_TAGS.products];
    case "product-detail":
      return getProductDetailTags(request);
    case "all":
      return PRODUCTS_ALL_TAGS;
  }
}

function getRevalidationTags(request: RevalidationRequest): string[] {
  switch (request.module) {
    case "app-config":
      return getAppConfigTags(request);
    case "taxonomy":
      return getTaxonomyTags(request);
    case "products":
      return getProductsTags(request);
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedRequest = await parseRequest(request);
  if (!parsedRequest.success) {
    return parsedRequest.response;
  }

  const tags = [...new Set(getRevalidationTags(parsedRequest.data))];
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  return Response.json({
    revalidated: true,
    module: parsedRequest.data.module,
    scope: parsedRequest.data.scope,
    tags,
  });
}
