'use client'

import { use } from 'react'
import EditProductPage from '@/components/partner/product/EditProductPage'

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)

  return <EditProductPage productId={resolvedParams.id} />
}