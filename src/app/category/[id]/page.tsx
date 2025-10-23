'use client'

import { use } from 'react'
import CategoryProductList from '@/components/category/CategoryProductList'

export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const decodedCategoryName = decodeURIComponent(resolvedParams.id)

  return <CategoryProductList categoryName={decodedCategoryName} />
}
