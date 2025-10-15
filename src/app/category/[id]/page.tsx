'use client'

import { use } from 'react'
import Header from '@/components/Header'
import CategoryProductList from '@/components/category/CategoryProductList'

export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const decodedCategoryName = decodeURIComponent(resolvedParams.id)

  return (
    <>
      <Header />
      <CategoryProductList categoryName={decodedCategoryName} />
    </>
  )
}
