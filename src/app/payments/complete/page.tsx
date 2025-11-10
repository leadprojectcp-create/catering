import { Suspense } from 'react'
import PaymentCompletePage from '@/components/payments/PaymentCompletePage'
import Loading from '@/components/Loading'

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PaymentCompletePage />
    </Suspense>
  )
}
