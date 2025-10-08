import AdminHeader from '@/components/admin/AdminHeader'
import MagazineEditPage from '@/components/admin/magazine/MagazineEditPage'

export default async function AdminMagazineEditPageWrapper({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <AdminHeader />
      <MagazineEditPage magazineId={id} />
    </>
  )
}