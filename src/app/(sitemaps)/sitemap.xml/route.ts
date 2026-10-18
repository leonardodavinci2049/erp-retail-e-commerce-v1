import { connection } from "next/server";
import { getSitemapBaseUrl } from "../base-url";
import { getProductSitemapLocations } from "../product-sitemap";
import { sitemapServiceUnavailable } from "../sitemap-response";

/**
 * Sitemap Index - Main sitemap that references all other sitemaps
 * This follows the sitemap index protocol for large sites
 */
export async function GET(request: Request) {
  // Com Cache Components, aguarda uma requisição antes de consultar a API.
  await connection();

  const baseUrl = getSitemapBaseUrl(request);

  let productSitemaps: string[];

  try {
    productSitemaps = await getProductSitemapLocations(baseUrl);
  } catch {
    return sitemapServiceUnavailable();
  }

  const sitemaps = [
    `${baseUrl}/sitemap-static.xml`,
    `${baseUrl}/sitemap-categories.xml`,
    ...productSitemaps,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (sitemap) => `  <sitemap>
    <loc>${sitemap}</loc>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
