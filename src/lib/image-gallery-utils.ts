import type { GalleryImage } from "@/types/api-assets";

function toComparableImageKey(url: string): string {
  const safeUrl = url.trim();
  if (!safeUrl) {
    return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(safeUrl, "http://localhost");
  } catch {
    // Unexpected URL shape: compare raw values instead of grouping by name.
    return `raw:${safeUrl.toLowerCase()}`;
  }

  const assetsImagePath = parsed.pathname.match(
    /\/uploads\/images\/\d{4}\/\d{2}\/\d{2}\/([\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12})(?:\/|$)/i,
  );

  if (assetsImagePath) {
    return `asset:${assetsImagePath[1].toLowerCase()}`;
  }

  const normalizedPath = parsed.pathname.replace(
    /-(thumbnail|medium|preview|original)(\.[^/.]+)$/i,
    "$2",
  );

  return `url:${parsed.origin}${normalizedPath}${parsed.search}`;
}

function getGalleryImageKeys(
  image: Pick<GalleryImage, "id" | "urls">,
): string[] {
  return [
    `id:${image.id.toLowerCase()}`,
    image.urls.original,
    image.urls.preview ?? "",
    image.urls.medium ?? "",
    image.urls.thumbnail ?? "",
  ]
    .map((value, index) => (index === 0 ? value : toComparableImageKey(value)))
    .filter(Boolean);
}

/**
 * Keeps distinct Assets API records while collapsing variants and PATH_IMAGEM
 * URLs that point to the same asset.
 */
export function getUniqueGalleryImages(
  galleryImages: GalleryImage[],
  fallbackImage: string,
): GalleryImage[] {
  const seenImageKeys = new Set(
    fallbackImage ? [toComparableImageKey(fallbackImage)] : [],
  );

  return galleryImages.filter((image) => {
    const imageKeys = getGalleryImageKeys(image);
    if (imageKeys.some((key) => seenImageKeys.has(key))) {
      return false;
    }

    for (const key of imageKeys) {
      seenImageKeys.add(key);
    }

    return true;
  });
}
