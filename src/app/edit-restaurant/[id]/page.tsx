'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EditRestaurantPage from '@/components/restaurant/EditRestaurantPage'

export default function EditRestaurant({ params }: { params: { id: string } }) {
  const router = useRouter()

  const handleCategorySelect = (category: string) => {
    if (category === '전체') {
      router.push('/')
    } else {
      router.push(`/?category=${encodeURIComponent(category)}`)
    }
  }

  return (
    <>
      <Header
        selectedCategory="전체"
        onCategorySelect={handleCategorySelect}
      />
      <EditRestaurantPage restaurantId={params.id} />
      <Footer />
    </>
  )
}