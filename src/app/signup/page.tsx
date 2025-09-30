'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import SignupPage from '@/components/auth/SignupPage'

function SignupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedType = searchParams.get('type') as 'user' | 'partner' | null

  useEffect(() => {
    // 파트너 타입이면 3단계 회원가입으로 리다이렉트
    if (selectedType === 'partner') {
      const params = new URLSearchParams(searchParams.toString())
      router.replace(`/signup/partner/step1?${params.toString()}`)
      return
    }
  }, [selectedType, searchParams, router])

  // 일반 사용자만 이 페이지 사용
  if (selectedType === 'partner') {
    return <div>Redirecting...</div>
  }

  return <SignupPage />
}

export default function Signup() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupContent />
    </Suspense>
  )
}