import { Suspense } from 'react'
import ChooseTypePage from '@/components/auth/ChooseTypePage'

export default function ChooseType() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChooseTypePage />
    </Suspense>
  )
}