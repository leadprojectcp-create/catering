import { Suspense } from 'react'
import PaymentsPage from '@/components/payments/PaymentsPage'
import Loading from '@/components/Loading'

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PaymentsPage />
    </Suspense>
  )
}
