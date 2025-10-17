'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import NoticeListPage from '@/components/admin/notices/NoticeListPage'
import AuthGuard from '@/components/auth/AuthGuard'

export default function NoticesPage() {
  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <NoticeListPage />
    </AuthGuard>
  )
}
