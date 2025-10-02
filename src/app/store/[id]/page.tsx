import StoreDetail from '@/components/store/StoreDetail'

interface StorePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StorePage({ params }: StorePageProps) {
  const { id } = await params

  return <StoreDetail storeId={id} />
}
