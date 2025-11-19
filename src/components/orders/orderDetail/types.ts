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
  id?: string // PortOne V2 paymentId
  paymentId?: string // PortOne V1 결제 ID (deprecated, use id for V2)
  paidAt: Date
  imp_uid?: string // PortOne V1 결제 ID
  paid_at?: number // Unix 타임스탬프 (초 단위)
  paymentKey?: string
  orderId?: string
  merchant_uid?: string
  amount?: number | { total?: number; [key: string]: unknown } // PortOne V2는 객체 구조
  method?: string
  status?: string
  cancelledAt?: Date
  cancelled_at?: number
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
