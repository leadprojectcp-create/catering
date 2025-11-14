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
        hostname: 'danmo.b-cdn.net',
      },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일 캐싱
    formats: ['image/webp'],
  },
};

export default nextConfig;
