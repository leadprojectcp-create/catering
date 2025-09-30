import { Suspense } from 'react'
import TermsAgreementPage from '@/components/auth/TermsAgreementPage'

export default function TermsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TermsAgreementPage />
    </Suspense>
  )
}