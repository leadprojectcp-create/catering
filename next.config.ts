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
  // WebView 백그라운드 복귀 시 흰 화면 방지를 위한 설정
  reactStrictMode: false, // Strict mode 비활성화 (이중 렌더링 방지)
  experimental: {
    optimizePackageImports: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
  },
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
