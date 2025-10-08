'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean  // true: 로그인 필요, false: 로그인하면 리다이렉트
  requireCompleteRegistration?: boolean  // true: 완전한 회원가입 필요
  redirectTo?: string    // 리다이렉트할 경로
}

export default function AuthGuard({
  children,
  requireAuth = true,
  requireCompleteRegistration = true,
  redirectTo
}: AuthGuardProps) {
  const { user, userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return // 로딩 중이면 아무것도 하지 않음

    if (requireAuth && !user) {
      // 로그인이 필요한데 로그인되지 않은 경우
      router.push(redirectTo || '/login')
    } else if (!requireAuth && user && userData?.registrationComplete) {
      // 로그인하면 안 되는 페이지인데 완전히 가입된 사용자인 경우
      router.push(redirectTo || '/')
    } else if (requireAuth && requireCompleteRegistration && user && userData && !userData.registrationComplete) {
      // 로그인되었지만 가입이 완료되지 않은 경우 회원 유형 선택으로 이동
      router.push('/signup/choose-type')
    }
  }, [user, userData, loading, requireAuth, requireCompleteRegistration, redirectTo, router])

  // 로딩 중이면 로딩 화면
  if (loading) {
    return <Loading />
  }

  // 조건에 맞지 않으면 빈 화면 (리다이렉트 중)
  if ((requireAuth && !user) ||
      (!requireAuth && user && userData?.registrationComplete) ||
      (requireAuth && requireCompleteRegistration && user && userData && !userData.registrationComplete)) {
    return null
  }

  // 조건에 맞으면 자식 컴포넌트 렌더링
  return <>{children}</>
}