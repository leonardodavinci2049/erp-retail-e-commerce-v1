import { getUniqueGalleryImages } from "@/lib/image-gallery-utils";
import type { GalleryImage } from "@/types/api-assets";
import { ImageGalleryClient } from "./componets/ImageGalleryClient";

// Tipo simplificado para o cliente de galeria
export interface GalleryImageData {
  id: string;
  originalName: string;
  urls: {
    original: string;
    preview?: string;
    medium?: string;
    thumbnail?: string;
  };
  isPrimary: boolean;
}

interface ProductImageGalleryProps {
  galleryImages: GalleryImage[];
  fallbackImage?: string;
  productName: string;
}

const DEFAULT_IMAGE_URL = "/images/product/no-image.jpeg";

export function ProductImageGallery({
  galleryImages,
  fallbackImage,
  productName,
}: ProductImageGalleryProps) {
  const mainImageUrl = fallbackImage || DEFAULT_IMAGE_URL;

  const mainDisplayImage: GalleryImageData = {
    id: "main-fallback",
    originalName: fallbackImage ? "product-image" : "no-image",
    urls: {
      original: mainImageUrl,
      preview: mainImageUrl,
      medium: mainImageUrl,
      thumbnail: mainImageUrl,
    },
    isPrimary: true,
  };

  // Avoids a duplicate when PATH_IMAGEM and the API point to the same asset.
  const uniqueApiImages = getUniqueGalleryImages(
    galleryImages,
    mainImageUrl,
  ).map((img) => ({
    id: img.id,
    originalName: img.originalName,
    urls: img.urls,
    isPrimary: img.isPrimary,
  }));

  const displayImages = [mainDisplayImage, ...uniqueApiImages];

  return (
    <ImageGalleryClient images={displayImages} productName={productName} />
  );
}
