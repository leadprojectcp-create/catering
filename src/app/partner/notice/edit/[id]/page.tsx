import PartnerHeader from '@/components/partner/PartnerHeader'
import NoticeEditPage from '@/components/partner/notice/NoticeEditPage'

export default async function NoticeEditPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <PartnerHeader />
      <NoticeEditPage noticeId={id} />
    </>
  )
}
