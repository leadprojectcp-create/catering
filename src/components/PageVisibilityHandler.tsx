'use client'

import { useEffect } from 'react'

export default function PageVisibilityHandler() {
  useEffect(() => {
    let hiddenTime: number | null = null
    const RELOAD_THRESHOLD = 30 * 1000 // 30초 (5분에서 단축)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 페이지가 백그라운드로 갈 때 시간 기록
        hiddenTime = Date.now()
        console.log('[Page Visibility] 페이지가 백그라운드로 이동')
      } else {
        // 페이지가 다시 포그라운드로 올 때
        console.log('[Page Visibility] 페이지가 포그라운드로 복귀')

        if (hiddenTime) {
          const hiddenDuration = Date.now() - hiddenTime

          // 30초 이상 백그라운드에 있었으면 새로고침
          if (hiddenDuration > RELOAD_THRESHOLD) {
            console.log(`[Page Visibility] 페이지가 ${Math.round(hiddenDuration / 1000)}초 동안 백그라운드에 있었습니다. 새로고침합니다.`)
            window.location.reload()
          } else {
            console.log(`[Page Visibility] 페이지가 다시 포그라운드로 돌아왔습니다. (${Math.round(hiddenDuration / 1000)}초)`)
            // 짧은 시간일 경우 새로고침 없이 그냥 복귀
          }

          hiddenTime = null
        }
      }
    }

    // iOS에서 앱이 백그라운드에서 복귀할 때를 위한 이벤트
    const handlePageShow = (event: PageTransitionEvent) => {
      console.log('[Page Visibility] pageshow event, persisted:', event.persisted)
      // bfcache(back-forward cache)에서 복원된 경우
      if (event.persisted) {
        console.log('[Page Visibility] 페이지가 bfcache에서 복원되었습니다. 새로고침합니다.')
        window.location.reload()
      }
    }

    // WebView에서 resume 이벤트 처리
    const handleResume = () => {
      console.log('[Page Visibility] Resume event detected')
      if (hiddenTime) {
        const hiddenDuration = Date.now() - hiddenTime
        if (hiddenDuration > RELOAD_THRESHOLD) {
          console.log('[Page Visibility] Resume 후 새로고침')
          window.location.reload()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('resume', handleResume)
    document.addEventListener('resume', handleResume)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('resume', handleResume)
      document.removeEventListener('resume', handleResume)
    }
  }, [])

  return null
}
