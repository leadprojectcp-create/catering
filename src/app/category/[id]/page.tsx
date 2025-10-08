import CategoryStoreList from '@/components/category/CategoryStoreList'

interface CategoryPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params
  const decodedCategoryName = decodeURIComponent(id)

  return <CategoryStoreList categoryName={decodedCategoryName} />
}
