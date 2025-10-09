import PartnerHeader from '@/components/partner/PartnerHeader'
import NoticeEditPage from '@/components/partner/notice/NoticeEditPage'

export default function NoticeEditPageRoute({ params }: { params: { id: string } }) {
  return (
    <>
      <PartnerHeader />
      <NoticeEditPage noticeId={params.id} />
    </>
  )
}
