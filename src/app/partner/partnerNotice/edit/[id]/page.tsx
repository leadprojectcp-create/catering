import PartnerNoticeEditPage from '@/components/partner/partnerNotice/PartnerNoticeEditPage'

export default async function PartnerNoticeEditPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PartnerNoticeEditPage noticeId={id} />
}
