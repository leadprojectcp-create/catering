import PartnerNoticeViewPage from '@/components/partner/partnerNotice/PartnerNoticeViewPage'

export default async function PartnerNoticeViewPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PartnerNoticeViewPage noticeId={id} />
}
