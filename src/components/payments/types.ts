export interface OrderItem {
  options: { [key: string]: string }
  optionsWithPrices?: { [key: string]: { name: string; price: number } }
  additionalOptions?: { [key: string]: string }
  additionalOptionsWithPrices?: { [key: string]: { name: string; price: number } }
  quantity: number
  price?: number
  itemPrice?: number
  paymentId?: string  // 어느 결제에 포함된 상품인지
  isAddItem?: boolean // 추가 주문 상품인지 (true: 추가 주문, false/undefined: 최초 주문)
}

export interface DeliveryFeeSettings {
  type: '무료' | '유료' | '조건부 무료' | '수량별'
  baseFee?: number
  freeCondition?: number
  perQuantity?: number
  paymentMethods?: ('선결제' | '착불')[]
}

export interface OrderData {
  storeId: string
  storeName: string
  productId: string
  productName: string
  productPrice: number
  originalPrice?: number
  discount?: {
    discountAmount: number
    discountPercent: number
  }
  productImage: string
  items: OrderItem[] // 모든 주문 상품 (최초 + 추가 주문 모두 포함, isAddItem과 paymentId로 구분)
  deliveryMethods?: string[]
  deliveryMethod?: string
  totalPrice?: number
  storeRequest?: string
  minOrderDays?: number
  deliveryFeeSettings?: DeliveryFeeSettings
}

export interface DeliveryAddress {
  id: string
  name: string
  orderer: string
  phone: string
  email: string
  address: string
  detailAddress?: string
  zipCode?: string
  deliveryDate?: string
  deliveryTime?: string
  request?: string
  isDefault?: boolean
  defaultDelivery?: boolean
}

export interface OrderInfo {
  address: string
  detailAddress: string
  phone: string
  email: string
  orderer: string
  zipCode: string
  deliveryDate: string
  deliveryTime: string
  request: string
}

export interface DaumPostcodeData {
  roadAddress: string
  jibunAddress: string
  userSelectedType: 'R' | 'J'
  zonecode: string
}

export interface DaumPostcode {
  new(options: { oncomplete: (data: DaumPostcodeData) => void }): { open: () => void }
}

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcode
    }
  }
}
