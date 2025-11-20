'use client'

import { useEffect, useState } from 'react'
import OrdersPage from '@/components/orders/OrdersPage'

export default function Page() {
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // 모바일 환경인지 확인
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    // 이미 앱 WebView 내에 있는지 확인 (User-Agent에 앱 식별자가 있는지)
    const isInAppWebView = /DanmoApp/i.test(navigator.userAgent)

    // 모바일이고 앱 WebView가 아닐 때만 리다이렉트 시도
    if (isMobile && !isInAppWebView) {
      setIsRedirecting(true)

      // 앱 스킴으로 리다이렉트 시도
      const appScheme = 'danmo://danchemoim.com/orders'
      window.location.href = appScheme

      // 2초 후 앱이 열리지 않았다면 웹 페이지 표시
      setTimeout(() => {
        setIsRedirecting(false)
      }, 2000)
    }
  }, [])

  if (isRedirecting) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: '1rem'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>앱으로 이동 중...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return <OrdersPage />
}
