'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import AdminLogsPage from '@/components/admin/AdminLogsPage'

export default function AdminLogs() {
  return (
    <>
      <AdminHeader />
      <AdminLogsPage />
    </>
  )
}

export const dynamic = 'force-dynamic'