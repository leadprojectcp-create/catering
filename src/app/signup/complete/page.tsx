import { Suspense } from 'react'
import CompleteSignupPage from '@/components/auth/CompleteSignupPage'

export default function CompleteSignup() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompleteSignupPage />
    </Suspense>
  )
}