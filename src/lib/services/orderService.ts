import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

/**
 * 주문번호 생성 (YYYYMMDD + 랜덤 영문숫자 6자리)
 * 예: 20251125W4F3A2
 * 6자리로 충분히 고유성 보장 (36^6 = 약 21억 가지)
 */
const generateOrderNumber = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  // 영문(대문자) + 숫자 조합 6자리 생성 (중복 가능성 극히 낮음)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomStr = ''
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return `${dateStr}${randomStr}`
}

export interface OrderItem {
  productId: string
  productName: string
  options: { [key: string]: string }
  quantity: number
  price: number
}

export interface Order {
  id?: string
  orderNumber?: string // 주문번호 (YYYYMMDDXXXX)
  userId: string
  storeId: string
  storeName: string
  items: OrderItem[]

  // 배송 정보
  deliveryMethod: string
  orderer: string
  phone: string
  address: string
  detailAddress: string
  recipient: string
  deliveryDate: string
  deliveryTime: string
  request: string
  detailedRequest?: string

  // 가격 정보
  totalProductPrice: number
  deliveryFee: number
  totalPrice: number

  // 주문 상태 (업체 승인/거부)
  orderStatus: 'pending' | 'accepted' | 'rejected' | 'preparing' | 'shipping' | 'delivered' | 'cancelled'

  // 결제 상태
  paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'failed'

  // 결제 정보 (포트원 연동 후 추가 예정)
  paymentMethod?: string
  paymentId?: string
  paidAt?: Date | Timestamp | null

  // 타임스탬프
  createdAt?: Date | Timestamp
  updatedAt?: Date | Timestamp
}

/**
 * 주문 생성
 */
export const createOrder = async (orderData: Omit<Order, 'id' | 'orderNumber'>): Promise<string> => {
  try {
    // 현재 인증된 사용자 확인
    const { auth } = await import('@/lib/firebase')
    const currentUser = auth.currentUser

    if (!currentUser) {
      throw new Error('로그인이 필요합니다.')
    }

    // 토큰 새로고침 (권한 확인)
    await currentUser.getIdToken(true)
    console.log('Firebase Auth 토큰 새로고침 완료')
    console.log('Current User UID:', currentUser.uid)
    console.log('Order Data userId:', orderData.userId)

    // 고유한 주문번호 생성 (중복 체크 없이)
    const orderNumber = generateOrderNumber()

    // Firestore Timestamp로 현재 시간 생성
    const now = Timestamp.now()

    // 저장할 데이터 준비
    const orderToSave = {
      userId: orderData.userId,
      storeId: orderData.storeId,
      storeName: orderData.storeName,
      items: orderData.items,
      deliveryMethod: orderData.deliveryMethod,
      orderer: orderData.orderer,
      phone: orderData.phone,
      address: orderData.address,
      detailAddress: orderData.detailAddress,
      recipient: orderData.recipient,
      deliveryDate: orderData.deliveryDate,
      deliveryTime: orderData.deliveryTime,
      request: orderData.request,
      detailedRequest: orderData.detailedRequest || '',
      totalProductPrice: orderData.totalProductPrice,
      deliveryFee: orderData.deliveryFee,
      totalPrice: orderData.totalPrice,
      orderNumber,
      orderStatus: 'pending' as const, // 주문 대기 (업체 승인 필요)
      paymentStatus: 'unpaid' as const, // 결제 미완료
      createdAt: now,
      updatedAt: now
    }

    console.log('=== 저장할 주문 데이터 ===')
    console.log(JSON.stringify(orderToSave, null, 2))

    // addDoc으로 문서 ID 자동 생성
    const docRef = await addDoc(collection(db, 'orders'), orderToSave)

    console.log('주문 생성 완료. 문서 ID:', docRef.id, '주문번호:', orderNumber)
    return orderNumber
  } catch (error) {
    console.error('주문 생성 실패:', error)
    throw error
  }
}

/**
 * 주문 상세 조회
 */
export const getOrder = async (orderId: string): Promise<Order | null> => {
  try {
    const docRef = doc(db, 'orders', orderId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Order
    }

    return null
  } catch (error) {
    console.error('주문 조회 실패:', error)
    throw error
  }
}

/**
 * 사용자의 주문 목록 조회
 */
export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))
  } catch (error) {
    console.error('주문 목록 조회 실패:', error)
    throw error
  }
}

/**
 * 파트너(스토어)의 주문 목록 조회
 */
export const getStoreOrders = async (storeId: string): Promise<Order[]> => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('storeId', '==', storeId),
      orderBy('createdAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))
  } catch (error) {
    console.error('스토어 주문 목록 조회 실패:', error)
    throw error
  }
}

/**
 * 주문 상태 업데이트 (업체 승인/거부 등)
 */
export const updateOrderStatus = async (
  orderId: string,
  orderStatus: Order['orderStatus']
): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId)
    await updateDoc(docRef, {
      orderStatus,
      updatedAt: serverTimestamp()
    })

    console.log(`주문 ${orderId} 상태 업데이트: ${orderStatus}`)
  } catch (error) {
    console.error('주문 상태 업데이트 실패:', error)
    throw error
  }
}

/**
 * 결제 상태 업데이트
 */
export const updatePaymentStatus = async (
  orderId: string,
  paymentStatus: Order['paymentStatus']
): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId)
    await updateDoc(docRef, {
      paymentStatus,
      updatedAt: serverTimestamp()
    })

    console.log(`주문 ${orderId} 결제 상태 업데이트: ${paymentStatus}`)
  } catch (error) {
    console.error('결제 상태 업데이트 실패:', error)
    throw error
  }
}

/**
 * 결제 완료 처리 (포트원 연동 후 사용)
 */
export const completePayment = async (
  orderId: string,
  paymentData: {
    paymentMethod: string
    paymentId: string
  }
): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId)
    await updateDoc(docRef, {
      paymentStatus: 'paid',
      paymentMethod: paymentData.paymentMethod,
      paymentId: paymentData.paymentId,
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    console.log(`주문 ${orderId} 결제 완료`)
  } catch (error) {
    console.error('결제 완료 처리 실패:', error)
    throw error
  }
}

/**
 * 주문 취소
 */
export const cancelOrder = async (orderId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'orders', orderId)
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp()
    })

    console.log(`주문 ${orderId} 취소 완료`)
  } catch (error) {
    console.error('주문 취소 실패:', error)
    throw error
  }
}

// TODO: 포트원(PortOne) 결제 연동
// - 결제 요청 API
// - 결제 검증 API
// - 결제 취소/환불 API
