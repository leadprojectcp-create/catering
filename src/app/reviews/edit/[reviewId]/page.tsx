import ReviewEditPage from '@/components/reviews/ReviewEditPage'

export default async function ReviewEditRoute({ params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params
  return <ReviewEditPage reviewId={reviewId} />
}
