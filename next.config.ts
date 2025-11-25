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
        hostname: 'danmo-cdn.win',
      },
      {
        protocol: 'https',
        hostname: 'danmo.b-cdn.net', // 레거시 BunnyCDN 지원 (마이그레이션 기간)
      },
    ],
    // 실제 사용되는 이미지 크기만 생성 (불필요한 srcset 방지)
    // StoreList: 130px, 배너: 640px, 상세: 390px
    deviceSizes: [390, 640, 750],
    imageSizes: [130, 260],
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
