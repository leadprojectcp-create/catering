import AdminEditProductPage from '@/components/admin/products/AdminEditProductPage'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminProductEditPage({ params }: PageProps) {
  const { id } = await params
  return <AdminEditProductPage productId={id} />
}
