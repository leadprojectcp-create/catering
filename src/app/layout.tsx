import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import LayoutWrapper from "@/components/LayoutWrapper";
import PageWrapper from "@/components/PageWrapper";
import NativeAuthBridge from "@/components/NativeAuthBridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "단모 - 단체의 모-든것",
  description: "단모는 단체주문 메타 플랫폼입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          crossOrigin="anonymous"
          async
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize Kakao SDK
              if (window.Kakao && !window.Kakao.isInitialized()) {
                window.Kakao.init('${process.env.NEXT_PUBLIC_KAKAO_JS_KEY || ''}');
              }

              document.addEventListener('touchstart', function(event) {
                if (event.touches.length > 1) {
                  event.preventDefault();
                }
              }, { passive: false });

              let lastTouchEnd = 0;
              document.addEventListener('touchend', function(event) {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                  event.preventDefault();
                }
                lastTouchEnd = now;
              }, false);

              // Prevent zoom on input/textarea focus (모든 input에 적용)
              document.addEventListener('touchstart', function(event) {
                const target = event.target;
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                  const viewport = document.querySelector('meta[name=viewport]');
                  if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
                  }
                }
              }, { passive: true });

              document.addEventListener('blur', function(event) {
                setTimeout(function() {
                  const activeElement = document.activeElement;
                  if (!activeElement || (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')) {
                    const viewport = document.querySelector('meta[name=viewport]');
                    if (viewport) {
                      viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
                    }
                  }
                }, 100);
              }, true);

              // Prevent zoom on input focus
              window.addEventListener('resize', function() {
                if (document.activeElement.tagName === 'INPUT' ||
                    document.activeElement.tagName === 'TEXTAREA') {
                  window.scrollTo(0, 0);
                  document.body.scrollTop = 0;
                }
              });
            `,
          }}
        />
        {/* Bunny CDN preconnect for faster image loading */}
        <link rel="preconnect" href="https://danmo.b-cdn.net" />
        <link rel="dns-prefetch" href="https://danmo.b-cdn.net" />

        <link
          rel="preload"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <meta name="naver-site-verification" content="a00f1ff3666695b7dd8f581a4622b89ea40925c4" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <NativeAuthBridge />
          <PageWrapper>
            {children}
          </PageWrapper>
          <LayoutWrapper />
        </AuthProvider>
      </body>
    </html>
  );
}
