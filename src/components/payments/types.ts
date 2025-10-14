export interface OrderItem {
  options: { [key: string]: string }
  optionsWithPrices?: { [key: string]: { name: string; price: number } }
  quantity: number
  price?: number
  itemPrice?: number
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
  items: OrderItem[]
  deliveryMethods?: string[]
  totalPrice?: number
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
