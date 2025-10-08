'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AuthGuard from '@/components/auth/AuthGuard'

export default function AdminDashboardPage() {
  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <AdminDashboard />
    </AuthGuard>
  )
}

export const dynamic = 'force-dynamic'
