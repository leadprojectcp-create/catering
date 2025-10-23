import OrderDetailPage from '@/components/orders/OrderDetailPage'

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  return <OrderDetailPage params={params} />
}
