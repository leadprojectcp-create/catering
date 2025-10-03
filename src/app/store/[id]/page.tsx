import StoreDetail from '@/components/store/StoreDetail'
import { extractUidFromSlug } from '@/lib/utils/slug'

interface StorePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StorePage({ params }: StorePageProps) {
  const { id } = await params

  // slug에서 실제 uid 추출
  // id는 "서울-강남구-맛있는가게-디저트-abc123uid" 형식
  const storeId = extractUidFromSlug(id)

  return <StoreDetail storeId={storeId} />
}
