import NoticeDetail from '@/components/notices/NoticeDetail'

export default function NoticeDetailPage({ params }: { params: { noticeId: string } }) {
  return <NoticeDetail noticeId={params.noticeId} />
}
