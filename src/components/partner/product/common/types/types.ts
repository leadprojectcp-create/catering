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

export interface QuantityRange {
  minQuantity: number
  maxQuantity: number
  daysBeforeOrder: number
}

export interface DeliveryFeeSettings {
  type: '무료' | '조건부 무료' | '유료' | '수량별'
  baseFee?: number
  freeCondition?: number
  paymentMethods?: ('선결제' | '착불')[]
  perQuantity?: number
}

export interface ProductFormData {
  name: string
  images: File[]
  price: number
  category: string[]
  productTypes: string[]
  options: ProductOption[]
  additionalOptions: ProductOption[]
  description: string
  minOrderQuantity: number
  maxOrderQuantity: number
  quantityRanges?: QuantityRange[]
  deliveryMethods: string[]
  deliveryFeeSettings?: DeliveryFeeSettings
  additionalSettings: string[]
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
