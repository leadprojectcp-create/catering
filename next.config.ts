import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tripjoy.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: 'danmo.b-cdn.net',
      },
    ],
    formats: ['image/webp'],
    deviceSizes: [640, 750, 1080, 1920],
    imageSizes: [120, 195, 256],
    minimumCacheTTL: 3600,
    unoptimized: false,
  },
};

export default nextConfig;
