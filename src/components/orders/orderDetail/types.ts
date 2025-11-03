export interface OrderItem {
  productId: string
  productName: string
  options: { [key: string]: string }
  additionalOptions?: { [key: string]: string }
  optionsWithPrices?: { [key: string]: { name: string; price: number } }
  additionalOptionsWithPrices?: { [key: string]: { name: string; price: number } }
  quantity: number
  price: number
  itemPrice?: number
  productImage?: string
  isAddItem?: boolean
  paymentId?: string
  createdAt?: Date
  discountedPrice?: number
  discount?: {
    discountAmount: number
    discountPercent: number
    startDate?: string | null
    endDate?: string | null
    isAlwaysActive?: boolean
  }
}

export interface DeliveryInfo {
  addressName?: string
  deliveryDate: string
  deliveryTime: string
  address: string
  detailAddress?: string
  recipient: string
  recipientPhone: string
  deliveryRequest?: string
  detailedRequest?: string
}

export interface PaymentInfo {
  paymentId: string
  paidAt: Date
  paymentKey?: string
  orderId?: string
  amount?: number
  method?: string
  status?: string
  cancelledAt?: Date
}

export interface Order {
  id: string
  uid: string
  storeId: string
  storeName: string
  partnerId?: string
  partnerPhone?: string
  items: OrderItem[]
  totalPrice: number
  totalProductPrice: number
  deliveryFee: number
  orderStatus: string
  paymentStatus: string
  deliveryMethod: string
  deliveryInfo?: DeliveryInfo
  paymentInfo?: PaymentInfo[]
  // 이전 형식 호환을 위한 필드들
  deliveryDate?: string
  deliveryTime?: string
  address?: string
  detailAddress?: string
  recipient?: string
  orderer: string
  phone: string
  request?: string
  deliveryRequest?: string
  detailedRequest?: string
  paymentId?: string
  transactionId?: string
  orderNumber?: string
  createdAt: Date
  usedPoint?: number
  // 퀵 배송 관련 필드
  quickDeliveryOrderNo?: number
  quickDeliveryStatus?: string
  quickDeliveryError?: string
  quickDeliveryInfo?: {
    code: string
    orderNo: number
    orderInfo?: {
      feeTotal?: number
      feeDetail?: string
    }
    callInfo?: {
      senderPhone?: string
      receiverPhone?: string
    }
    driverInfo?: {
      driverName?: string
      driverPhone?: string
    }
  }
}

export interface DriverInfo {
  driverName: string
  driverPhone: string
  driverImageUrl?: string
  vehicleNumber?: string
}
