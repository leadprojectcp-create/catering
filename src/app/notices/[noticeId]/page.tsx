import NoticeDetail from '@/components/notices/NoticeDetail'

export default async function NoticeDetailPage({ params }: { params: Promise<{ noticeId: string }> }) {
  const { noticeId } = await params
  return <NoticeDetail noticeId={noticeId} />
}
