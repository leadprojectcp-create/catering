import { ArrowLeft } from 'lucide-react'

interface OrderHeaderProps {
  restaurant: {
    name: string
    category: string
    image: string
  }
  onBack: () => void
}

export default function OrderHeader({ restaurant, onBack }: OrderHeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center py-4">
          <button
            onClick={onBack}
            className="mr-4 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center">
            <span className="text-3xl mr-3">{restaurant.image}</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
              <p className="text-sm text-gray-600">{restaurant.category} 단체주문</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}