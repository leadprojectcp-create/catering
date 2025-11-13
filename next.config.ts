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
    unoptimized: true, // Bunny CDN이 이미 최적화를 처리함
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일 캐싱
  },
};

export default nextConfig;
