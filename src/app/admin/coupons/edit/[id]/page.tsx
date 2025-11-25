import CouponEditPage from '@/components/admin/coupons/CouponEditPage'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminCouponEditPage({ params }: PageProps) {
  const { id } = await params
  return <CouponEditPage couponId={id} />
}
