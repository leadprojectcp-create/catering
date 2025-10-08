import Header from '@/components/Header'
import OrderPage from '@/components/order/OrderPage'

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

  return (
    <>
      <Header />
      <OrderPage productId={productId} storeId={storeId || ''} />
    </>
  )
}
