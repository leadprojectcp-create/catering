import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore'

// 쿠폰 템플릿 타입
export interface CouponTemplate {
  id?: string
  name: string
  description?: string
  type: 'percentage' | 'fixed' // 퍼센트 할인 vs 고정 금액
  value: number // 할인 값 (10% 또는 10000원)
  minOrderAmount: number // 최소 주문 금액
  maxDiscountAmount?: number // 최대 할인 금액 (퍼센트일 때)
  validDays: number // 발급 후 유효 기간 (일)
  isActive: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

// 유저별 발급된 쿠폰 타입
export interface UserCoupon {
  id?: string
  couponId: string // 쿠폰 템플릿 ID
  couponName: string
  description?: string
  userId: string
  userName?: string
  userEmail?: string
  type: 'percentage' | 'fixed'
  value: number
  minOrderAmount: number
  maxDiscountAmount?: number
  issuedAt: Timestamp
  expiresAt: Timestamp
  usedAt?: Timestamp | null
  orderId?: string | null // 사용된 주문 ID
  status: 'available' | 'used' | 'expired'
}

// 쿠폰 템플릿 컬렉션 참조
const couponsCollection = collection(db, 'coupons')

// 유저 쿠폰 컬렉션 참조
const userCouponsCollection = collection(db, 'userCoupons')

// ============ 쿠폰 템플릿 CRUD ============

// 모든 쿠폰 템플릿 조회
export async function getAllCouponTemplates(): Promise<CouponTemplate[]> {
  const q = query(couponsCollection, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CouponTemplate))
}

// 활성화된 쿠폰 템플릿만 조회
export async function getActiveCouponTemplates(): Promise<CouponTemplate[]> {
  const q = query(
    couponsCollection,
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CouponTemplate))
}

// 쿠폰 템플릿 단건 조회
export async function getCouponTemplate(id: string): Promise<CouponTemplate | null> {
  const docRef = doc(db, 'coupons', id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as CouponTemplate
  }
  return null
}

// 쿠폰 템플릿 생성
export async function createCouponTemplate(data: Omit<CouponTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  // undefined 값 제거 (Firestore는 undefined를 허용하지 않음)
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  )

  const docRef = await addDoc(couponsCollection, {
    ...cleanData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
  return docRef.id
}

// 쿠폰 템플릿 수정
export async function updateCouponTemplate(id: string, data: Partial<CouponTemplate>): Promise<void> {
  // undefined 값 제거 (Firestore는 undefined를 허용하지 않음)
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  )

  const docRef = doc(db, 'coupons', id)
  await updateDoc(docRef, {
    ...cleanData,
    updatedAt: Timestamp.now()
  })
}

// 쿠폰 템플릿 삭제
export async function deleteCouponTemplate(id: string): Promise<void> {
  const docRef = doc(db, 'coupons', id)
  await deleteDoc(docRef)
}

// ============ 유저 쿠폰 관리 ============

// 유저에게 쿠폰 발급 (단일)
export async function issueCouponToUser(
  couponTemplate: CouponTemplate,
  userId: string,
  userName?: string,
  userEmail?: string
): Promise<string> {
  const now = Timestamp.now()
  const expiresAt = Timestamp.fromDate(
    new Date(now.toDate().getTime() + couponTemplate.validDays * 24 * 60 * 60 * 1000)
  )

  const userCouponData: Record<string, unknown> = {
    couponId: couponTemplate.id!,
    couponName: couponTemplate.name,
    userId,
    type: couponTemplate.type,
    value: couponTemplate.value,
    minOrderAmount: couponTemplate.minOrderAmount,
    issuedAt: now,
    expiresAt,
    usedAt: null,
    orderId: null,
    status: 'available'
  }

  // 선택적 필드 (undefined 방지)
  if (couponTemplate.description) userCouponData.description = couponTemplate.description
  if (userName) userCouponData.userName = userName
  if (userEmail) userCouponData.userEmail = userEmail
  if (couponTemplate.maxDiscountAmount !== undefined) {
    userCouponData.maxDiscountAmount = couponTemplate.maxDiscountAmount
  }

  const docRef = await addDoc(userCouponsCollection, userCouponData)
  return docRef.id
}

// 여러 유저에게 쿠폰 일괄 발급
export async function issueCouponToUsers(
  couponTemplate: CouponTemplate,
  users: Array<{ uid: string; name?: string; email?: string }>
): Promise<number> {
  const batch = writeBatch(db)
  const now = Timestamp.now()
  const expiresAt = Timestamp.fromDate(
    new Date(now.toDate().getTime() + couponTemplate.validDays * 24 * 60 * 60 * 1000)
  )

  let count = 0
  for (const user of users) {
    const userCouponRef = doc(userCouponsCollection)

    const userCouponData: Record<string, unknown> = {
      couponId: couponTemplate.id,
      couponName: couponTemplate.name,
      userId: user.uid,
      type: couponTemplate.type,
      value: couponTemplate.value,
      minOrderAmount: couponTemplate.minOrderAmount,
      issuedAt: now,
      expiresAt,
      usedAt: null,
      orderId: null,
      status: 'available'
    }

    // 선택적 필드 (undefined 방지)
    if (couponTemplate.description) userCouponData.description = couponTemplate.description
    if (user.name) userCouponData.userName = user.name
    if (user.email) userCouponData.userEmail = user.email
    if (couponTemplate.maxDiscountAmount !== undefined) {
      userCouponData.maxDiscountAmount = couponTemplate.maxDiscountAmount
    }

    batch.set(userCouponRef, userCouponData)
    count++
  }

  await batch.commit()
  return count
}

// 특정 유저의 쿠폰 목록 조회
export async function getUserCoupons(userId: string): Promise<UserCoupon[]> {
  const q = query(
    userCouponsCollection,
    where('userId', '==', userId),
    orderBy('issuedAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as UserCoupon))
}

// 특정 유저의 사용 가능한 쿠폰만 조회
export async function getAvailableUserCoupons(userId: string): Promise<UserCoupon[]> {
  const q = query(
    userCouponsCollection,
    where('userId', '==', userId),
    where('status', '==', 'available'),
    orderBy('expiresAt', 'asc')
  )
  const snapshot = await getDocs(q)

  // 만료된 쿠폰 필터링
  const now = new Date()
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserCoupon))
    .filter(coupon => coupon.expiresAt.toDate() > now)
}

// 쿠폰 사용 처리
export async function useCoupon(couponId: string, orderId: string): Promise<void> {
  const docRef = doc(db, 'userCoupons', couponId)
  await updateDoc(docRef, {
    status: 'used',
    usedAt: Timestamp.now(),
    orderId
  })
}

// 쿠폰 사용 취소 (주문 취소 시)
export async function cancelCouponUsage(couponId: string): Promise<void> {
  const docRef = doc(db, 'userCoupons', couponId)
  await updateDoc(docRef, {
    status: 'available',
    usedAt: null,
    orderId: null
  })
}

// 만료된 쿠폰 상태 업데이트 (배치 작업용)
export async function updateExpiredCoupons(): Promise<number> {
  const now = Timestamp.now()
  const q = query(
    userCouponsCollection,
    where('status', '==', 'available'),
    where('expiresAt', '<', now)
  )

  const snapshot = await getDocs(q)
  if (snapshot.empty) return 0

  const batch = writeBatch(db)
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { status: 'expired' })
  })

  await batch.commit()
  return snapshot.size
}

// 쿠폰 할인 금액 계산
export function calculateCouponDiscount(
  coupon: UserCoupon,
  orderAmount: number
): number {
  if (orderAmount < coupon.minOrderAmount) {
    return 0
  }

  let discount = 0
  if (coupon.type === 'percentage') {
    discount = Math.floor(orderAmount * (coupon.value / 100))
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount
    }
  } else {
    discount = coupon.value
  }

  // 할인 금액이 주문 금액을 초과하지 않도록
  return Math.min(discount, orderAmount)
}

// 쿠폰 포맷팅 (표시용)
export function formatCouponValue(coupon: { type: 'percentage' | 'fixed'; value: number }): string {
  if (coupon.type === 'percentage') {
    return `${coupon.value}%`
  }
  return `${coupon.value.toLocaleString()}원`
}
