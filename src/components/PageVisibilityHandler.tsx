'use client'

import { useEffect } from 'react'

export default function PageVisibilityHandler() {
  useEffect(() => {
    let hiddenTime: number | null = null
    const RELOAD_THRESHOLD = 5 * 60 * 1000 // 5분

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 페이지가 백그라운드로 갈 때 시간 기록
        hiddenTime = Date.now()
      } else {
        // 페이지가 다시 포그라운드로 올 때
        if (hiddenTime) {
          const hiddenDuration = Date.now() - hiddenTime

          // 5분 이상 백그라운드에 있었으면 새로고침
          if (hiddenDuration > RELOAD_THRESHOLD) {
            console.log(`[Page Visibility] 페이지가 ${Math.round(hiddenDuration / 1000)}초 동안 백그라운드에 있었습니다. 새로고침합니다.`)
            window.location.reload()
          } else {
            console.log(`[Page Visibility] 페이지가 다시 포그라운드로 돌아왔습니다. (${Math.round(hiddenDuration / 1000)}초)`)
          }

          hiddenTime = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
