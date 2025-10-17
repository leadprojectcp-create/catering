'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import NoticeEditPage from '@/components/admin/notices/NoticeEditPage'
import AuthGuard from '@/components/auth/AuthGuard'
import { use } from 'react'

export default function NoticeEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <NoticeEditPage id={id} />
    </AuthGuard>
  )
}
