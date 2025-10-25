export interface OptionValue {
  name: string
  price: number
}

export interface ProductOption {
  groupName: string
  values: OptionValue[]
}

export interface CategoryOption {
  id: string
  name: string
  icon: string
}

export interface ProductFormData {
  name: string
  images: File[]
  price: number
  category: string
  productTypes: string[]
  options: ProductOption[]
  additionalOptions: ProductOption[]
  description: string
  minOrderQuantity: number
  maxOrderQuantity: number
  deliveryMethods: string[]
  additionalSettings: string[]
  minOrderDays: number
  origin: { ingredient: string, origin: string }[]
  discount?: {
    enabled: boolean
    type: 'amount' | 'percent'
    value: number
    startDate: string | null
    endDate: string | null
    isAlwaysActive: boolean
  }
}

export const categories: CategoryOption[] = [
  { id: 'dessert', name: '디저트', icon: '/icons/dessert_box.png' },
  { id: 'sandwich', name: '샌드위치', icon: '/icons/sandwich_bakery.png' },
  { id: 'salad', name: '샐러드/과일', icon: '/icons/salad_fruit.png' },
  { id: 'kimbap', name: '김밥', icon: '/icons/kimbap_korean.png' },
  { id: 'lunchbox', name: '도시락', icon: '/icons/dosilak.png' },
  { id: 'traditional', name: '떡/전통한과', icon: '/icons/ricecake_traditional.png' }
]
