import ProductDetailPage from '@/components/productDetail/ProductDetailPage'

interface PageProps {
  params: Promise<{
    productId: string
  }>
  searchParams: Promise<{
    storeId?: string
  }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { productId } = await params
  const { storeId } = await searchParams

  return <ProductDetailPage productId={productId} storeId={storeId || ''} />
}
