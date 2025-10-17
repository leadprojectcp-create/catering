'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import NoticeViewPage from '@/components/admin/notices/NoticeViewPage'
import AuthGuard from '@/components/auth/AuthGuard'

export default function NoticeView({ params }: { params: { id: string } }) {
  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <NoticeViewPage id={params.id} />
    </AuthGuard>
  )
}
