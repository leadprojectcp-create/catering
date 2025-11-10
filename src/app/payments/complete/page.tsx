import { Suspense } from 'react'
import PaymentCompletePage from '@/components/payments/complete/PaymentCompletePage'
import Loading from '@/components/Loading'

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PaymentCompletePage />
    </Suspense>
  )
}
