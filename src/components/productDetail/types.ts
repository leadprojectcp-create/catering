// 공통 타입 정의

export interface Store {
  id: string
  storeName: string
  address?: {
    city?: string
    district?: string
    dong?: string
    fullAddress?: string
    detail?: string
  }
  phone?: string
  description?: string
  storeImages?: string[]
  primaryCategory?: string
  categories?: string[]
}

export interface Product {
  id: string
  name: string
  price: number
  discountedPrice?: number
  discount?: {
    type?: 'amount' | 'percent'
    value?: number
    discountAmount: number
    discountPercent: number
    startDate?: string | null
    endDate?: string | null
    isAlwaysActive?: boolean
  }
  images?: string[]
  description?: string
  minOrderQuantity?: number
  maxOrderQuantity?: number
  minOrderDays?: number
  quantityRanges?: {
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]
  deliveryMethods?: string[]
  additionalSettings?: string[]
  origin?: { ingredient: string; origin: string }[]
  storeId: string
  productTypes?: string[]
  averageRating?: number
  reviewCount?: number
  optionsEnabled?: boolean
  options?: {
    groupName: string
    values: { name: string; price: number }[]
    isRequired?: boolean
  }[]
  additionalOptionsEnabled?: boolean
  additionalOptions?: {
    groupName: string
    values: { name: string; price: number }[]
  }[]
  deliveryFeeSettings?: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    paymentMethods?: ('선결제' | '착불')[]
    perQuantity?: number
  }
}

export interface CartItem {
  options: { [key: string]: string }
  additionalOptions?: { [key: string]: string }
  quantity: number
}

export interface Review {
  id: string
  userId: string
  userName?: string
  rating: number
  content: string
  images?: string[]
  createdAt: Date
  reply?: {
    content: string
    createdAt: Date
    partnerId: string
  }
}

// 옵션 가격 조회 헬퍼 함수
export const getOptionPrice = (product: Product, groupName: string, optionName: string): number => {
  const group = product.options?.find(g => g.groupName?.trim() === groupName?.trim())
  const option = group?.values.find(v => v.name?.trim() === optionName?.trim())
  return option?.price || 0
}

// 추가옵션 가격 조회 헬퍼 함수
export const getAdditionalOptionPrice = (product: Product, groupName: string, optionName: string): number => {
  const group = product.additionalOptions?.find(g => g.groupName?.trim() === groupName?.trim())
  const option = group?.values.find(v => v.name?.trim() === optionName?.trim())
  return option?.price || 0
}
