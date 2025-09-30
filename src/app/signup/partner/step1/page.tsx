import { Suspense } from 'react'
import PartnerSignupStep1 from '@/components/auth/PartnerSignupStep1'

export default function PartnerSignupStep1Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PartnerSignupStep1 />
    </Suspense>
  )
}