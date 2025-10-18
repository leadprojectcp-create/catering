import FaqEditPage from '@/components/admin/faqs/FaqEditPage'

export default async function AdminFaqEditPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <FaqEditPage id={id} />
}
