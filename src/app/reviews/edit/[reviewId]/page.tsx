import ReviewEditPage from '@/components/reviews/ReviewEditPage'

export default function ReviewEditRoute({ params }: { params: { reviewId: string } }) {
  return <ReviewEditPage reviewId={params.reviewId} />
}
