'use client'

import { Suspense } from 'react'
import AdminOrderManagementPage from '@/components/admin/orders/AdminOrderManagementPage'
import Loading from '@/components/Loading'

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminOrderManagementPage />
    </Suspense>
  )
}
