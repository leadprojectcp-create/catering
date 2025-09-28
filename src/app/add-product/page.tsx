'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AddProductPage from '@/components/product/AddProductPage'

export default function AddProduct() {
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
      <AddProductPage />
      <Footer />
    </>
  )
}