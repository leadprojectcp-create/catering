import { Suspense } from 'react'
import OrderPage from '@/components/order/OrderPage'

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">로딩 중...</p>
      </div>
    </div>
  )
}

export default function Order() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OrderPage />
    </Suspense>
  )
}