import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AdminLogsPage from '@/components/admin/AdminLogsPage'

export default function AdminLogs() {
  return (
    <>
      <Header />
      <AdminLogsPage />
      <Footer />
    </>
  )
}

export const dynamic = 'force-dynamic'