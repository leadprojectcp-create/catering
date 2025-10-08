import MagazineDetailPage from '@/components/magazine/MagazineDetailPage'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MagazineDetailPageWrapper({ params }: PageProps) {
  const { id } = await params

  return <MagazineDetailPage magazineId={id} />
}