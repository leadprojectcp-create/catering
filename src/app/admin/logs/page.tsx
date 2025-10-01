'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AdminLogsPage from '@/components/admin/AdminLogsPage'

export default function AdminLogs() {
  const router = useRouter()

  const handleCategorySelect = (category: string) => {
    if (category === '전체') {
      router.push('/')
    } else {
      router.push(`/?category=${encodeURIComponent(category)}`)
    }
  }

  return (
    <>
      <Header />
      <AdminLogsPage />
      <Footer />
    </>
  )
}

export const dynamic = 'force-dynamic'