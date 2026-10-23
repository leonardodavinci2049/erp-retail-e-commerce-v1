/**
 * Cache configuration for Next.js 16 'use cache' directive
 * Defines cache tags for granular cache invalidation with cacheTag()
 *
 * Cache profiles are defined in next.config.ts:
 * - "hours": stale after 4 hours, revalidate after 8 hours, expire after 24 hours (products, categories)
 * - "gallery": stale after 8 hours, revalidate after 16 hours, expire after 24 hours (product galleries)
 * - "daily": 24 hours cache (footer, static content)
 */

// Cache tags for granular invalidation with cacheTag()
export const CACHE_TAGS = {
  // Dynamic tag generators
  product: (id: string) => `product-${id}`,
  productGallery: (id: string) => `product-gallery-${id}`,
  category: (id: string) => `category-${id}`,
  appConfig: (id: string) => `app-config-${id}`,
  appMenuType: (type: string) => `app-menu-type-${type}`,

  // Static tags
  products: "products",
  productGalleries: "product-galleries",
  categories: "categories",
  navigation: "navigation",
  appConfigs: "app-configs",
  appMenus: "app-menus",
  banners: "banners",
  footer: "footer",
} as const;

// Cache life profiles (matching next.config.ts cacheLife)
export const CACHE_PROFILES = {
  hours: "hours", // Products and categories
  gallery: "gallery", // Product galleries
  daily: "daily", // 24 hours - footer
} as const;

// Type helpers
export type CacheTagKey = keyof typeof CACHE_TAGS;
export type CacheProfile = keyof typeof CACHE_PROFILES;
export type ProductTag = ReturnType<typeof CACHE_TAGS.product>;
export type CategoryTag = ReturnType<typeof CACHE_TAGS.category>;
