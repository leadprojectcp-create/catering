import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import LayoutWrapper from "@/components/LayoutWrapper";
import PageWrapper from "@/components/PageWrapper";
import NativeAuthBridge from "@/components/NativeAuthBridge";
import FcmHandler from "@/components/FcmHandler";
import PageVisibilityHandler from "@/components/PageVisibilityHandler";
import ErrorBoundary from "@/components/ErrorBoundary";

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
              // 페이지 로드 시 즉시 실행 - 백그라운드 복귀 감지 및 강제 새로고침
              (function() {
                try {
                  const PAGE_LOAD_KEY = '__page_load_time__';
                  const BACKGROUND_KEY = '__background_time__';
                  const MAX_BACKGROUND_TIME = 5 * 60 * 1000; // 5분

                  // 현재 시간
                  const now = Date.now();

                  // 이전 페이지 로드 시간 확인
                  const lastLoadTime = sessionStorage.getItem(PAGE_LOAD_KEY);
                  const backgroundTime = sessionStorage.getItem(BACKGROUND_KEY);

                  // 백그라운드에서 복귀한 경우 체크
                  if (backgroundTime) {
                    const timeInBackground = now - parseInt(backgroundTime);
                    console.log('[Early Reload Check] 백그라운드 시간:', Math.round(timeInBackground / 1000), '초');

                    if (timeInBackground > MAX_BACKGROUND_TIME) {
                      console.log('[Early Reload Check] 5분 이상 백그라운드에 있었음. 강제 새로고침 필요');
                      sessionStorage.removeItem(BACKGROUND_KEY);
                      sessionStorage.setItem(PAGE_LOAD_KEY, now.toString());
                      // bfcache에서 복원된 경우가 아니라면 바로 리로드
                      if (performance.getEntriesByType('navigation')[0]?.type !== 'back_forward') {
                        window.location.reload();
                      }
                    } else {
                      sessionStorage.removeItem(BACKGROUND_KEY);
                    }
                  }

                  // 현재 페이지 로드 시간 저장
                  sessionStorage.setItem(PAGE_LOAD_KEY, now.toString());

                  // visibilitychange 이벤트로 백그라운드 진입 감지
                  document.addEventListener('visibilitychange', function() {
                    if (document.hidden) {
                      sessionStorage.setItem(BACKGROUND_KEY, Date.now().toString());
                      console.log('[Early Reload Check] 백그라운드로 진입');
                    } else {
                      const bgTime = sessionStorage.getItem(BACKGROUND_KEY);
                      if (bgTime) {
                        const duration = Date.now() - parseInt(bgTime);
                        console.log('[Early Reload Check] 포그라운드로 복귀, 백그라운드 시간:', Math.round(duration / 1000), '초');

                        if (duration > MAX_BACKGROUND_TIME) {
                          console.log('[Early Reload Check] 강제 새로고침 실행');
                          window.location.reload();
                        } else {
                          sessionStorage.removeItem(BACKGROUND_KEY);
                        }
                      }
                    }
                  });

                  // pageshow 이벤트로 bfcache 복원 감지
                  window.addEventListener('pageshow', function(event) {
                    if (event.persisted) {
                      const bgTime = sessionStorage.getItem(BACKGROUND_KEY);
                      if (bgTime) {
                        const duration = Date.now() - parseInt(bgTime);
                        console.log('[Early Reload Check] bfcache 복원, 백그라운드 시간:', Math.round(duration / 1000), '초');

                        if (duration > MAX_BACKGROUND_TIME) {
                          console.log('[Early Reload Check] bfcache 복원 후 강제 새로고침');
                          window.location.reload();
                        }
                      }
                    }
                  });
                } catch (error) {
                  console.error('[Early Reload Check] Error:', error);
                }
              })();

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
        <ErrorBoundary>
          <AuthProvider>
            <NativeAuthBridge />
            <FcmHandler />
            <PageVisibilityHandler />
            <PageWrapper>
              {children}
            </PageWrapper>
            <LayoutWrapper />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
