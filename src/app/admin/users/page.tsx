'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import UserManagementPage from '@/components/admin/users/UserManagementPage'
import AuthGuard from '@/components/auth/AuthGuard'

export default function AdminUsersPage() {
  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <UserManagementPage />
    </AuthGuard>
  )
}
