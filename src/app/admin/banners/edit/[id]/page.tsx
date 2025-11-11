import BannerEditPage from '@/components/admin/banners/BannerEditPage'

export default async function BannerEditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <BannerEditPage bannerId={id} />
}
