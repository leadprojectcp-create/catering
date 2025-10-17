'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import NoticeWritePage from '@/components/admin/notices/NoticeWritePage'
import AuthGuard from '@/components/auth/AuthGuard'

export default function NoticeWrite() {
  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <NoticeWritePage />
    </AuthGuard>
  )
}
