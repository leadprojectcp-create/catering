import AdminHeader from '@/components/admin/AdminHeader'
import MagazineViewPage from '@/components/admin/magazine/MagazineViewPage'

export default async function AdminMagazineViewPageWrapper({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <AdminHeader />
      <MagazineViewPage magazineId={id} />
    </>
  )
}