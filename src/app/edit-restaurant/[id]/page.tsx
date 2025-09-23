'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EditRestaurantPage from '@/components/restaurant/EditRestaurantPage'

export default function EditRestaurant({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

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
      <EditRestaurantPage restaurantId={id} />
      <Footer />
    </>
  )
}