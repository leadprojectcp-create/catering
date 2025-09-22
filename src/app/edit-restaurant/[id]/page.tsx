import Header from '@/components/Header'
import Footer from '@/components/Footer'
import EditRestaurantPage from '@/components/restaurant/EditRestaurantPage'

export default function EditRestaurant({ params }: { params: { id: string } }) {
  return (
    <>
      <Header />
      <EditRestaurantPage restaurantId={params.id} />
      <Footer />
    </>
  )
}