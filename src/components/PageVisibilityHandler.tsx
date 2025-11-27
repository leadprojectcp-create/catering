'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PageVisibilityHandler() {
  const router = useRouter()

  useEffect(() => {
    // 네이티브 앱에서는 React Native가 앱 상태를 관리하므로 이 핸들러 비활성화
    // @ts-expect-error - isNativeApp은 React Native 앱에서 주입됨
    if (typeof window !== 'undefined' && window.isNativeApp) {
      console.log('[Page Visibility] 네이티브 앱에서는 비활성화됨')
      return
    }

    let hiddenTime: number | null = null
    let lastActivityTime = Date.now()
    const RELOAD_THRESHOLD = 30 * 1000 // 30초
    const FORCE_RELOAD_THRESHOLD = 5 * 60 * 1000 // 5분
    const HEALTH_CHECK_INTERVAL = 10 * 1000 // 10초마다 체크
    const MAX_FREEZE_TIME = 20 * 1000 // 20초 이상 freeze되면 강제 새로고침

    // 페이지가 살아있음을 확인하는 heartbeat
    const updateActivity = () => {
      lastActivityTime = Date.now()
    }

    // 주기적으로 페이지가 freeze되었는지 체크
    const healthCheckInterval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivityTime

      // 마지막 활동 이후 너무 오래 지났으면 강제 새로고침
      if (timeSinceLastActivity > MAX_FREEZE_TIME) {
        console.log(`[Page Visibility] 페이지가 ${Math.round(timeSinceLastActivity / 1000)}초 동안 응답 없음. 강제 새로고침합니다.`)
        window.location.reload()
        return
      }

      // heartbeat 업데이트
      updateActivity()
      console.log('[Page Visibility] Health check: 페이지 정상 작동 중')
    }, HEALTH_CHECK_INTERVAL)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 페이지가 백그라운드로 갈 때 시간 기록
        hiddenTime = Date.now()
        console.log('[Page Visibility] 페이지가 백그라운드로 이동')
      } else {
        // 페이지가 다시 포그라운드로 올 때
        console.log('[Page Visibility] 페이지가 포그라운드로 복귀')
        updateActivity() // 활동 시간 업데이트

        if (hiddenTime) {
          const hiddenDuration = Date.now() - hiddenTime

          // 5분 이상 백그라운드에 있었으면 hard reload (흰 화면 방지)
          if (hiddenDuration > FORCE_RELOAD_THRESHOLD) {
            console.log(`[Page Visibility] 페이지가 ${Math.round(hiddenDuration / 1000)}초 동안 백그라운드에 있었습니다. 강제 새로고침합니다.`)
            window.location.reload()
            return
          }
          // 30초 이상 백그라운드에 있었으면 soft reload
          else if (hiddenDuration > RELOAD_THRESHOLD) {
            console.log(`[Page Visibility] 페이지가 ${Math.round(hiddenDuration / 1000)}초 동안 백그라운드에 있었습니다. soft reload합니다.`)
            router.refresh()
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
      updateActivity() // 활동 시간 업데이트

      // bfcache(back-forward cache)에서 복원된 경우
      if (event.persisted) {
        console.log('[Page Visibility] 페이지가 bfcache에서 복원되었습니다.')
        // hiddenTime을 확인하여 오래 백그라운드에 있었으면 hard reload
        if (hiddenTime) {
          const hiddenDuration = Date.now() - hiddenTime
          if (hiddenDuration > FORCE_RELOAD_THRESHOLD) {
            console.log('[Page Visibility] bfcache 복원 후 강제 새로고침')
            window.location.reload()
            return
          }
        }
        router.refresh()
      }
    }

    // WebView에서 resume 이벤트 처리
    const handleResume = () => {
      console.log('[Page Visibility] Resume event detected')
      updateActivity() // 활동 시간 업데이트

      if (hiddenTime) {
        const hiddenDuration = Date.now() - hiddenTime
        // 5분 이상이면 hard reload
        if (hiddenDuration > FORCE_RELOAD_THRESHOLD) {
          console.log('[Page Visibility] Resume 후 강제 새로고침')
          window.location.reload()
          return
        }
        // 30초 이상이면 soft reload
        else if (hiddenDuration > RELOAD_THRESHOLD) {
          console.log('[Page Visibility] Resume 후 soft reload')
          router.refresh()
        }
      }
    }

    // Focus 이벤트 처리 (추가 안전장치)
    const handleFocus = () => {
      console.log('[Page Visibility] Window focus detected')
      updateActivity() // 활동 시간 업데이트

      if (hiddenTime) {
        const hiddenDuration = Date.now() - hiddenTime
        if (hiddenDuration > FORCE_RELOAD_THRESHOLD) {
          console.log('[Page Visibility] Focus 후 강제 새로고침')
          window.location.reload()
          return
        } else if (hiddenDuration > RELOAD_THRESHOLD) {
          console.log('[Page Visibility] Focus 후 soft reload')
          router.refresh()
        }
        hiddenTime = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('resume', handleResume)
    document.addEventListener('resume', handleResume)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(healthCheckInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('resume', handleResume)
      document.removeEventListener('resume', handleResume)
      window.removeEventListener('focus', handleFocus)
    }
  }, [router])

  return null
}
