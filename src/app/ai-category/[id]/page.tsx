import AICategoryProductList from '@/components/aiCategory/AICategoryProductList'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function AICategoryPage({ params }: Props) {
  const { id } = await params
  return <AICategoryProductList categoryId={id} />
}
