'use client'

import { Suspense } from 'react'
import AdminSurveyManagementPage from '@/components/admin/surveys/AdminSurveyManagementPage'
import Loading from '@/components/Loading'

export default function AdminSurveysPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminSurveyManagementPage />
    </Suspense>
  )
}
