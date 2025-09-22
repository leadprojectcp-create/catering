'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import OrderHeader from './OrderHeader'
import OrderForm from './OrderForm'

export default function OrderPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const restaurantId = searchParams.get('restaurant')

  const [restaurant, setRestaurant] = useState<any>(null)

  // 레스토랑 데이터 (실제로는 API에서 가져올 것)
  const restaurants = [
    {
      id: 1,
      name: '맘스터치 강남점',
      category: '치킨/버거',
      rating: 4.5,
      deliveryTime: '25-35분',
      deliveryFee: 3000,
      minOrder: 15000,
      image: '🍔'
    },
    {
      id: 2,
      name: '굽네치킨 서초점',
      category: '치킨',
      rating: 4.7,
      deliveryTime: '30-40분',
      deliveryFee: 2500,
      minOrder: 20000,
      image: '🍗'
    },
    {
      id: 3,
      name: '김밥천국 역삼점',
      category: '한식',
      rating: 4.2,
      deliveryTime: '20-30분',
      deliveryFee: 2000,
      minOrder: 12000,
      image: '🍱'
    },
    {
      id: 4,
      name: '피자헛 강남점',
      category: '피자',
      rating: 4.4,
      deliveryTime: '35-45분',
      deliveryFee: 3500,
      minOrder: 25000,
      image: '🍕'
    }
  ]

  useEffect(() => {
    if (restaurantId) {
      const foundRestaurant = restaurants.find(r => r.id === parseInt(restaurantId))
      setRestaurant(foundRestaurant)
    }
  }, [restaurantId])

  const handleSubmit = (formData: any) => {
    console.log('주문 신청:', formData)
    alert('단체주문 신청이 완료되었습니다!')
    router.push('/')
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">음식점을 찾을 수 없습니다</h2>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <OrderHeader restaurant={restaurant} onBack={() => router.back()} />

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg">
            <OrderForm
              restaurant={restaurant}
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}