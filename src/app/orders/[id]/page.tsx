import Header from '@/components/Header'
import OrderDetailPage from '@/components/orders/OrderDetailPage'

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Header />
      <OrderDetailPage params={params} />
    </>
  )
}
