import FaqViewPage from '@/components/admin/faqs/FaqViewPage'

export default async function AdminFaqViewPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <FaqViewPage id={id} />
}
