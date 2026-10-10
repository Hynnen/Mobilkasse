import type { NextConfig } from "next";

// Produktbilder hentes fra butikkens egen WordPress (wp-content/uploads).
function wooImagePatterns(): URL[] {
  try {
    return process.env.WOO_URL ? [new URL("/wp-content/uploads/**", process.env.WOO_URL)] : [];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Fontfilen til app-ikonene leses fra disk og må være med i serverbundlen på Vercel.
  outputFileTracingIncludes: {
    "/icons/[name]": ["./assets/fonts/**"],
    "/icon": ["./assets/fonts/**"],
    "/apple-icon": ["./assets/fonts/**"],
  },
  images: {
    remotePatterns: wooImagePatterns(),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
