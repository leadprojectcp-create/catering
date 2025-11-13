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
  },
};

export default nextConfig;
