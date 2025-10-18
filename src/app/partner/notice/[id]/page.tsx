import { use } from 'react'
import NoticeDetail from '@/components/partner/notice/NoticeDetail'

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <NoticeDetail noticeId={id} />
}
