import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import LayoutWrapper from "@/components/LayoutWrapper";
import PageWrapper from "@/components/PageWrapper";

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

              // 네이티브 앱에서 Google 로그인 결과 처리
              window.handleNativeGoogleLogin = async function(result) {
                console.log('[Native] Received Google login result:', result);
                try {
                  // Firebase Auth로 직접 signIn (이미 네이티브에서 인증됨)
                  const { getAuth, signInWithCredential, GoogleAuthProvider } = await import('firebase/auth');
                  const auth = getAuth();

                  // ID 토큰으로 credential 생성
                  const credential = GoogleAuthProvider.credential(result.idToken);
                  await signInWithCredential(auth, credential);

                  console.log('[Native] Successfully signed in to Firebase');
                  // 페이지 새로고침하여 AuthContext가 업데이트되도록 함
                  window.location.reload();
                } catch (error) {
                  console.error('[Native] Error signing in with credential:', error);
                }
              };

              window.handleNativeGoogleLoginError = function(error) {
                console.error('[Native] Google login error:', error);
                alert('로그인 중 오류가 발생했습니다.');
              };

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
        <link rel="preconnect" href="https://picktoeat.b-cdn.net" />
        <link rel="dns-prefetch" href="https://picktoeat.b-cdn.net" />

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
          <PageWrapper>
            {children}
          </PageWrapper>
          <LayoutWrapper />
        </AuthProvider>
      </body>
    </html>
  );
}
