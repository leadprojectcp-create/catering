'use client'

import { use } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CategoryStoreList from '@/components/category/CategoryStoreList'

export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const decodedCategoryName = decodeURIComponent(id)

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', padding: '20px 0' }}>
        <CategoryStoreList categoryName={decodedCategoryName} />
      </main>
      <Footer />
    </>
  )
}
