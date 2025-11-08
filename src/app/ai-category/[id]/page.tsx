import AICategoryProductList from '@/components/aiCategory/AICategoryProductList'

interface Props {
  params: {
    id: string
  }
}

export default function AICategoryPage({ params }: Props) {
  return <AICategoryProductList categoryId={params.id} />
}
