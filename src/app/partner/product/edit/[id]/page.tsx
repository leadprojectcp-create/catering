'use client'

import { use } from 'react'
// import PartnerHeader from '@/components/partner/PartnerHeader'
import EditProductPage from '@/components/partner/product/EditProductPage'

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)

  return (
    <>
      {/* <PartnerHeader /> */}
      <EditProductPage productId={resolvedParams.id} />
    </>
  )
}