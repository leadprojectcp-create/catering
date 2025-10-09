import PartnerHeader from '@/components/partner/PartnerHeader'
import NoticeViewPage from '@/components/partner/notice/NoticeViewPage'

export default async function NoticeViewPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <PartnerHeader />
      <NoticeViewPage noticeId={id} />
    </>
  )
}
