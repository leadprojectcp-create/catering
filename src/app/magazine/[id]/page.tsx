import MagazineDetailPage from '@/components/magazine/MagazineDetailPage'

interface PageProps {
  params: { id: string }
}

export default function MagazineDetailPageWrapper({ params }: PageProps) {
  return <MagazineDetailPage magazineId={params.id} />
}