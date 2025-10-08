'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AuthGuard from '@/components/auth/AuthGuard'

export default function AdminDashboardPage() {
  return (
    <AuthGuard requireAuth={true}>
      <Header />
      <AdminDashboard />
      <Footer />
    </AuthGuard>
  )
}

export const dynamic = 'force-dynamic'
