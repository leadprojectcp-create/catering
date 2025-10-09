import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Electron 빌드를 위한 정적 export 설정
  output: process.env.NEXT_BUILD_TARGET === 'electron' ? 'export' : undefined,

  images: {
    domains: ['tripjoy.b-cdn.net', 'picktoeat.b-cdn.net'],
    // 정적 export 시 이미지 최적화 비활성화
    unoptimized: process.env.NEXT_BUILD_TARGET === 'electron',
  },
};

export default nextConfig;
