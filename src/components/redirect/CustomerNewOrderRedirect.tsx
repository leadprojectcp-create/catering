'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './Redirect.module.css'

export default function CustomerNewOrderRedirect() {
  const searchParams = useSearchParams()
  const [showDownload, setShowDownload] = useState(false)

  useEffect(() => {
    // 모바일 환경인지 확인
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (!isMobile) {
      // PC에서 접속한 경우 앱 다운로드 페이지 표시
      setShowDownload(true)
      return
    }

    // URL 파라미터에서 주문번호 가져오기
    const orderNumber = searchParams.get('orderNumber')

    // 앱 스킴 URL - 고객 신규주문은 주문 목록으로
    const appScheme = `danmo:///orders`

    console.log('[Customer New Order Redirect] Redirecting to:', appScheme)

    // 앱 열기 시도
    window.location.href = appScheme

    // 2.5초 후 앱이 열리지 않았다면 스토어로 이동
    const timer = setTimeout(() => {
      console.log('[Customer New Order Redirect] App not opened, showing download page')
      setShowDownload(true)
    }, 2500)

    // 페이지가 숨겨지면 타이머 취소 (앱이 열렸다는 의미)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timer)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [searchParams])

  if (!showDownload) {
    return (
      <div className={styles.container}>
        <div className={styles.loader}></div>
        <p className={styles.message}>앱으로 이동 중...</p>
      </div>
    )
  }

  // 앱 다운로드 페이지
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)

  const handleDownload = () => {
    if (isIOS) {
      window.location.href = 'https://apps.apple.com/kr/app/%EB%8B%A8%EB%AA%A8-%EB%8B%A8%EC%B2%B4%EC%9D%98%EB%AA%A8%EB%93%A0%EA%B2%83/id6755390713'
    } else if (isAndroid) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.leadproject.danmo&hl=ko'
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.downloadCard}>
        <div className={styles.topTitle}>단체의 모-든것을 잇다</div>
        <h1 className={styles.title}>단체 전문 플랫폼 앱 단모</h1>
        <div className={styles.appIcon}>
          <img src="/assets/redirect.png" alt="단모 앱" />
        </div>
        <p className={styles.description}>지금바로 단모를 다운받으세요!</p>
        <button className={styles.downloadButton} onClick={handleDownload}>
          앱 실행하기
        </button>
      </div>
    </div>
  )
}
