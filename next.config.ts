import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tripjoy.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: 'picktoeat.b-cdn.net',
      },
    ],
  },
};

export default nextConfig;
