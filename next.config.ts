import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow remote images from any domain for product card display
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  experimental: {
    // Re-visiting a screen within 30s (e.g. Home ↔ Collections) shows it
    // instantly instead of refetching. Every create / edit / delete calls
    // router.refresh(), which clears this cache, so data never goes stale.
    staleTimes: {
      dynamic: 30,
    },
  },
  // Allow mobile / network access during development
  allowedDevOrigins: [
    '192.168.*.*',
    '192.168.240.38',
    'localhost:3000',
    '127.0.0.1:3000',
  ],
};

export default nextConfig;
