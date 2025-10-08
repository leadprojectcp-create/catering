import MagazineDetailPage from '@/components/magazine/MagazineDetailPage'

export default async function MagazineDetailPageWrapper({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <MagazineDetailPage magazineId={id} />
}