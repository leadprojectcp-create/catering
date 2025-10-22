'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MainPage from '@/components/MainPage'
import Loading from '@/components/Loading'

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // 서브도메인 체크
    const hostname = window.location.hostname
    console.log('[HomePage] hostname:', hostname)

    if (hostname === 'partner.danchemoim.com') {
      console.log('[HomePage] Redirecting to partner dashboard')
      router.replace('/partner/dashboard')
      // 리다이렉트 중에는 MainPage 렌더링하지 않음
      return
    }

    // 메인 도메인이면 MainPage 렌더링 허용
    setIsChecking(false)
  }, [router])

  // 체크 중이거나 partner 도메인이면 로딩 표시
  if (isChecking) {
    return <Loading />
  }

  return (
    <Suspense fallback={<Loading />}>
      <MainPage />
    </Suspense>
  )
}
