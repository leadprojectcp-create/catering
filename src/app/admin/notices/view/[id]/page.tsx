'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import NoticeViewPage from '@/components/admin/notices/NoticeViewPage'
import AuthGuard from '@/components/auth/AuthGuard'
import { use } from 'react'

export default function NoticeView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <NoticeViewPage id={id} />
    </AuthGuard>
  )
}
