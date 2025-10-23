import { Suspense } from 'react'
import ReviewWritePage from '@/components/reviews/ReviewWritePage'
import Loading from '@/components/Loading'

export default function ReviewWriteRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <ReviewWritePage />
    </Suspense>
  )
}
