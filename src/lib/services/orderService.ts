import { collection, getDocs, addDoc, query, orderBy, where, updateDoc, doc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore'
import { db } from '@/lib/firebase'

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
  paymentId?: string
  isAddItem?: boolean
}

export type OrderStatus = 'pending' | 'preparing' | 'shipping' | 'completed' | 'rejected' | 'cancelled' | 'cancelled_before_accept'

export interface PaymentInfo {
  id: string // PortOne V2 paymentId
  paymentId?: string // deprecated, use id instead
  paidAt: Date
  paymentKey?: string
  orderId?: string
  amount?: number | { total?: number; [key: string]: unknown } // PortOne V2는 객체 구조
  method?: string
  status?: string
  cancelledAt?: Date
}

export interface Order {
  id?: string
  orderNumber?: string
  uid: string
  userId?: string // deprecated, use uid instead
  storeId: string
  storeName: string
  partnerId?: string
  partnerPhone?: string
  items: OrderItem[]
  totalPrice: number
  totalProductPrice: number
  totalQuantity?: number
  totalAmount?: number // 총 결제 금액 (totalPrice + deliveryFee 등)
  deliveryFee: number
  orderStatus: OrderStatus
  paymentStatus: 'paid' | 'unpaid' | 'refunded'
  deliveryMethod: string
  parcelPaymentMethod?: '선결제' | '착불'
  deliveryDate: string
  deliveryTime: string
  deliveryInfo?: {
    deliveryDate?: string
    deliveryTime?: string
    recipient?: string
    recipientPhone?: string
    address?: string
    detailAddress?: string
    zipCode?: string
    addressName?: string
    entrancePassword?: string
    deliveryRequest?: string
    detailedRequest?: string
  }
  paymentId?: string[] | string // 결제 ID 배열 또는 단일 ID
  paymentInfo?: PaymentInfo[]
  address: string
  detailAddress: string
  recipient: string
  orderer: string
  phone: string
  request?: string
  detailedRequest?: string
  cancelReason?: string
  carrier?: string
  trackingNumber?: string
  trackingInfo?: {
    carrier: string
    trackingNumber: string
  }
  quickDeliveryOrderNo?: number
  quickDeliveryStatus?: 'requested' | 'failed' | 'error'
  quickDeliveryInfo?: {
    code: number
    orderNo: number
    orderInfo?: {
      feeTotal?: number
      feeDetail?: string
    }
    createdAt?: Date
  }
  quickDeliveryError?: string
  partnerNotified?: boolean
  partnerNotifiedAt?: Date | Timestamp | FieldValue
  allowAdditionalOrder?: boolean
  partnerMemo?: string
  settlementStatus?: 'pending' | 'completed'
  settlementDate?: Date | Timestamp | FieldValue
  settlementId?: string
  deliveryFeeSettings?: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    perQuantity?: number
  }
  quickDeliveryFeeSettings?: {
    type: '무료' | '조건부 지원' | '유료'
    baseFee?: number
    freeCondition?: number
    maxSupport?: number
  }
  deliveryFeeBreakdown?: {
    customerFee: number
    storeFee: number
    feeType: string
  }
  orderDates?: Array<{
    type: 'regular' | 'additional'
    createdAt: Date | Timestamp
    paymentId?: string
  }>
  createdAt?: Date | Timestamp | FieldValue
  updatedAt?: Date | Timestamp | FieldValue
}

const COLLECTION_NAME = 'orders'

// 모든 주문 가져오기 (관리자용)
export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))
  } catch (error) {
    console.error('주문 목록 조회 실패:', error)
    throw error
  }
}

// 상태별 주문 가져오기
export const getOrdersByStatus = async (status: OrderStatus): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('orderStatus', '==', status),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))
  } catch (error) {
    console.error('상태별 주문 조회 실패:', error)
    throw error
  }
}

// 주문 상태 업데이트
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  cancelReason?: string,
  trackingInfo?: { carrier: string; trackingNumber: string }
): Promise<void> => {
  try {
    const orderRef = doc(db, COLLECTION_NAME, orderId)
    const updateData: Partial<Order> = {
      orderStatus: status,
      updatedAt: new Date()
    }

    // 취소 사유가 있으면 추가
    if (cancelReason) {
      updateData.cancelReason = cancelReason
    }

    // 택배 정보가 있으면 네스티드 객체로 추가
    if (trackingInfo) {
      updateData.trackingInfo = trackingInfo
    }

    // 주문 상태가 completed로 변경되면 정산 상태를 pending으로 설정
    if (status === 'completed') {
      updateData.settlementStatus = 'pending'
    }

    await updateDoc(orderRef, updateData)
  } catch (error) {
    console.error('주문 상태 업데이트 실패:', error)
    throw error
  }
}

// 사용자별 주문 가져오기
export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))
  } catch (error) {
    console.error('사용자 주문 조회 실패:', error)
    throw error
  }
}

// 매장별 주문 가져오기 (결제 완료된 주문만)
export const getStoreOrders = async (storeId: string): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('storeId', '==', storeId),
      where('paymentStatus', '==', 'paid'),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))
  } catch (error) {
    console.error('매장 주문 조회 실패:', error)
    throw error
  }
}