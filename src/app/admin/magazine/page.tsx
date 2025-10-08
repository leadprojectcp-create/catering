'use client'

import AdminHeader from '@/components/admin/AdminHeader'
import MagazineListPage from '@/components/admin/magazine/MagazineListPage'
import AuthGuard from '@/components/auth/AuthGuard'

export default function AdminMagazinePage() {
  return (
    <AuthGuard requireAuth={true}>
      <AdminHeader />
      <MagazineListPage />
    </AuthGuard>
  )
}