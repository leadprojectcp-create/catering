'use client'

interface Restaurant {
  id: number
  name: string
  category: string
  rating: number
  deliveryTime: string
  deliveryFee: number
  minOrder: number
  image: string
}

interface RestaurantListProps {
  restaurants: Restaurant[]
  onOrderClick: (restaurant: Restaurant) => void
}

export default function RestaurantList({ restaurants, onOrderClick }: RestaurantListProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h2 className="text-2xl font-bold text-gray-900">주변 음식점</h2>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">전체</button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">치킨</button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">피자</button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">한식</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((restaurant) => (
          <div key={restaurant.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <span className="text-4xl mr-4">{restaurant.image}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{restaurant.name}</h3>
                  <p className="text-sm text-gray-600">{restaurant.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                <span className="flex items-center">⭐ {restaurant.rating}</span>
                <span className="flex items-center">🕐 {restaurant.deliveryTime}</span>
              </div>

              <div className="space-y-1 mb-6 text-sm text-gray-600">
                <p>배송비 {restaurant.deliveryFee.toLocaleString()}원</p>
                <p>최소주문 {restaurant.minOrder.toLocaleString()}원</p>
              </div>

              <button
                onClick={() => onOrderClick(restaurant)}
                className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                단체주문 신청
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}