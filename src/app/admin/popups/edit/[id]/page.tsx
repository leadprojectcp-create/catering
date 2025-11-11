import PopupEditPage from '@/components/admin/popups/PopupEditPage'

export default async function PopupEditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PopupEditPage popupId={id} />
}
