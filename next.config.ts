import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['tripjoy.b-cdn.net'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
