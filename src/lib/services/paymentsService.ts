import { collection, getDocs, addDoc, query, orderBy, where, updateDoc, doc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface OrderItem {
  productId: string
  productName: string
  options: { [key: string]: string }
  quantity: number
  price: number
}

export type OrderStatus = 'pending' | 'preparing' | 'shipping' | 'completed' | 'rejected' | 'cancelled'

export interface Order {
  id?: string
  orderNumber?: string
  userId: string
  storeId: string
  storeName: string
  partnerId?: string
  partnerPhone?: string
  items: OrderItem[]
  totalPrice: number
  totalProductPrice: number
  deliveryFee: number
  orderStatus: OrderStatus
  paymentStatus: 'paid' | 'unpaid'
  deliveryMethod: string
  deliveryDate: string
  deliveryTime: string
  address: string
  detailAddress: string
  recipient: string
  orderer: string
  phone: string
  request?: string
  detailedRequest?: string
  createdAt?: Date | Timestamp | FieldValue
  updatedAt?: Date | Timestamp | FieldValue
}

// 주문번호 생성 함수 (간단한 버전)
export const generateOrderNumber = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomStr = ''
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return `${dateStr}${randomStr}`
}

const COLLECTION_NAME = 'orders'

// 주문 생성
export const createOrder = async (orderData: Omit<Order, 'id'>): Promise<{ orderId: string; orderNumber: string }> => {
  try {
    const orderNumber = generateOrderNumber()
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...orderData,
      orderNumber,
      orderStatus: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return { orderId: docRef.id, orderNumber }
  } catch (error) {
    console.error('주문 생성 실패:', error)
    throw error
  }
}

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
  status: OrderStatus
): Promise<void> => {
  try {
    const orderRef = doc(db, COLLECTION_NAME, orderId)
    await updateDoc(orderRef, {
      orderStatus: status,
      updatedAt: new Date()
    })
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