'use client'

import { use } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CategoryStoreList from '@/components/category/CategoryStoreList'

export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const decodedCategoryName = decodeURIComponent(resolvedParams.id)

  return (
    <>
      <Header />
      <CategoryStoreList categoryName={decodedCategoryName} />
      <Footer />
    </>
  )
}
