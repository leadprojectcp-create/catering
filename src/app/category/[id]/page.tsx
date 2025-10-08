import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CategoryStoreList from '@/components/category/CategoryStoreList'

interface CategoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params
  const decodedCategoryName = decodeURIComponent(id)

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <CategoryStoreList categoryName={decodedCategoryName} />
      </main>
      <Footer />
    </>
  )
}
