import { Suspense } from 'react'
import Header from '@/components/Header'
import ReviewWritePage from '@/components/reviews/ReviewWritePage'
import Loading from '@/components/Loading'

export default function ReviewWriteRoute() {
  return (
    <>
      <Header />
      <Suspense fallback={<Loading />}>
        <ReviewWritePage />
      </Suspense>
    </>
  )
}
