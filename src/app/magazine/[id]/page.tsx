import MagazineDetailPage from '@/components/magazine/MagazineDetailPage'
import { extractMagazineIdFromSlug } from '@/lib/utils/slug'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MagazineDetail({ params }: PageProps) {
  const { id: slug } = await params
  const magazineId = extractMagazineIdFromSlug(slug)

  return <MagazineDetailPage magazineId={magazineId} />
}
