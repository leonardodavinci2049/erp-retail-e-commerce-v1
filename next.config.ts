import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  async rewrites() {
    return [
      {
        source: "/sitemap-products-:id.xml",
        destination: "/sitemap-products/:id",
      },
    ];
  },
  cacheLife: {
    // Perfil para produtos e categorias (stale 4h, revalidate 8h, expire 24h)
    hours: {
      stale: 4 * 60 * 60,
      revalidate: 8 * 60 * 60,
      expire: 24 * 60 * 60,
    },
    // Perfil para galerias de produtos (stale 8h, revalidate 16h, expire 24h)
    gallery: {
      stale: 8 * 60 * 60,
      revalidate: 16 * 60 * 60,
      expire: 24 * 60 * 60,
    },
    // Perfil para dados quase estáticos (24 horas)
    daily: {
      stale: 86400, // 24 horas
      revalidate: 3600, // 1 hora
      expire: 86400,
    },
  },
  images: {
    qualities: [75, 100],
    minimumCacheTTL: 86400, // Cache de imagens otimizadas por 24h (reduz re-fetches do servidor de assets)
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "mundialmegastore.com.br",
        port: "",
        pathname: "/**",
      },
      // Production assets domain
      {
        protocol: "https",
        hostname: "assents01.comsuporte.com.br",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5573",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
