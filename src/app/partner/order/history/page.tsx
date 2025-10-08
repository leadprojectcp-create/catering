'use client'

import PartnerHeader from '@/components/partner/PartnerHeader'
import OrderManagementPage from '@/components/partner/orders/OrderManagementPage'
import AuthGuard from '@/components/auth/AuthGuard'

export default function PartnerOrderHistoryPage() {
  return (
    <AuthGuard requireAuth={true}>
      <PartnerHeader />
      <OrderManagementPage />
    </AuthGuard>
  )
}
