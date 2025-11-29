'use client'

import { useEffect } from 'react'

/**
 * 페이지 가시성 변화를 추적하는 컴포넌트
 *
 * reload/refresh 없이 로그만 남겨서 흰 화면 원인을 추적합니다.
 * 추후 실제 원인을 파악한 후 적절한 해결책을 적용할 예정입니다.
 */
export default function PageVisibilityHandler() {
  useEffect(() => {
    // 네이티브 앱에서는 React Native가 앱 상태를 관리하므로 비활성화
    if (typeof window !== 'undefined' && (window as Window & { isNativeApp?: boolean }).isNativeApp) {
      console.log('[Page Visibility] 네이티브 앱에서는 비활성화됨')
      return
    }

    let hiddenTime: number | null = null

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now()
        console.log('[Page Visibility] 페이지가 백그라운드로 이동')
      } else {
        console.log('[Page Visibility] 페이지가 포그라운드로 복귀')

        if (hiddenTime) {
          const hiddenDuration = Date.now() - hiddenTime
          console.log(`[Page Visibility] 백그라운드에 있던 시간: ${Math.round(hiddenDuration / 1000)}초`)

          // 디버깅용: 현재 페이지 상태 체크
          console.log('[Page Visibility] 현재 상태:', {
            documentReadyState: document.readyState,
            bodyChildCount: document.body?.childElementCount,
            hasContent: document.body?.innerHTML?.length > 0,
          })

          hiddenTime = null
        }
      }
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      console.log('[Page Visibility] pageshow event, persisted:', event.persisted)

      if (event.persisted) {
        console.log('[Page Visibility] 페이지가 bfcache에서 복원됨')
      }
    }

    const handleFocus = () => {
      console.log('[Page Visibility] Window focus')
    }

    // 에러 감지
    const handleError = (event: ErrorEvent) => {
      console.error('[Page Visibility] JavaScript 에러 발생:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    }

    // unhandled rejection 감지
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Page Visibility] Unhandled Promise Rejection:', event.reason)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}
