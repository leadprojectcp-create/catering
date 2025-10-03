import { Suspense } from 'react'
import MainPage from '@/components/MainPage'
import Loading from '@/components/Loading'

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <MainPage />
    </Suspense>
  )
}
