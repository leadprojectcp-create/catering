import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['tripjoy.b-cdn.net', 'picktoeat.b-cdn.net'],
    unoptimized: true, // 이미지 최적화 비활성화 - 원본 그대로 사용
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'partner.danchemoim.com',
          },
        ],
        destination: '/partner/dashboard',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
