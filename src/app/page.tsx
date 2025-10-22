'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainPage from '@/components/MainPage'
import Loading from '@/components/Loading'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // 서브도메인 체크
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      console.log('[HomePage] hostname:', hostname)

      if (hostname === 'partner.danchemoim.com') {
        console.log('[HomePage] Redirecting to partner dashboard')
        router.replace('/partner/dashboard')
      }
    }
  }, [router])

  return (
    <Suspense fallback={<Loading />}>
      <MainPage />
    </Suspense>
  )
}
