'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import AdminLogsPage from '@/components/admin/AdminLogsPage'
import AuthGuard from '@/components/auth/AuthGuard'

export default function AdminLogs() {
  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <AdminLogsPage />
    </AuthGuard>
  )
}

export const dynamic = 'force-dynamic'