import PartnerHeader from '@/components/partner/PartnerHeader'
import NoticeViewPage from '@/components/partner/notice/NoticeViewPage'

export default function NoticeViewPageRoute({ params }: { params: { id: string } }) {
  return (
    <>
      <PartnerHeader />
      <NoticeViewPage noticeId={params.id} />
    </>
  )
}
