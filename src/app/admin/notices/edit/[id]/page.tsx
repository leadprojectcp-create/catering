'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import NoticeEditPage from '@/components/admin/notices/NoticeEditPage'
import AuthGuard from '@/components/auth/AuthGuard'

export default function NoticeEdit({ params }: { params: { id: string } }) {
  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <NoticeEditPage id={params.id} />
    </AuthGuard>
  )
}
