'use client'

import { Suspense, use } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CategoryStoreList from '@/components/category/CategoryStoreList'
import Loading from '@/components/Loading'

export default function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const decodedCategoryName = decodeURIComponent(id)

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh', padding: '20px 0' }}>
        <Suspense fallback={<Loading />}>
          <CategoryStoreList categoryName={decodedCategoryName} />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
