import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  FieldValue
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface CartItemOption {
  productId?: string
  productName?: string
  price?: number
  options: { [key: string]: string }
  additionalOptions?: { [key: string]: string }
  quantity: number
  optionsWithPrices?: { [key: string]: { name: string; price: number } }
  additionalOptionsWithPrices?: { [key: string]: { name: string; price: number } }
  itemPrice?: number  // 해당 아이템의 총 가격 (기본가격 + 옵션가격) * 수량
}

export interface CartItem {
  id?: string
  uid: string
  storeId: string
  storeName: string
  productId: string
  productName?: string  // 선택적 (하위 호환성)
  productPrice?: number  // 선택적 (하위 호환성)
  productImage?: string  // 선택적 (하위 호환성)
  items: CartItemOption[]  // 여러 옵션 조합을 배열로 저장
  totalProductPrice: number  // 상품 총액
  totalQuantity: number  // 총 수량
  totalPrice?: number  // 선택적 (하위 호환성)
  deliveryMethod?: string  // 배송 방법
  request?: string  // 요청사항
  deliveryFeeSettings?: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    paymentMethods?: ('선결제' | '착불')[]
    perQuantity?: number
  }
  parcelPaymentMethod?: '선결제' | '착불'  // 택배 결제 방식
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
}

// 하위 호환성을 위한 레거시 타입 (기존 단일 옵션 구조)
export interface LegacyCartItem {
  id?: string
  uid: string
  storeId: string
  productId: string
  productName: string
  productPrice: number
  productImage: string
  options: { [key: string]: string }
  quantity: number
  createdAt: Timestamp
}

const COLLECTION_NAME = 'shoppingCart'

// 장바구니 아이템 가져오기 (레거시 데이터 자동 변환)
export const getCartItems = async (userId: string): Promise<CartItem[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('uid', '==', userId),
      orderBy('createdAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => {
      const data = doc.data()

      // 레거시 구조 (options, quantity 필드가 있는 경우) → 새 구조로 변환
      if (data.options && data.quantity !== undefined && !data.items) {
        // totalPrice가 없으면 기본 가격으로 계산
        const totalPrice = data.totalPrice || (data.productPrice * data.quantity)

        return {
          id: doc.id,
          uid: data.uid,
          storeId: data.storeId,
          productId: data.productId,
          productName: data.productName,
          productPrice: data.productPrice,
          productImage: data.productImage,
          items: [{
            options: data.options,
            quantity: data.quantity
          }],
          totalPrice: totalPrice,
          createdAt: data.createdAt
        } as CartItem
      }

      // 새 구조 (items 배열이 있는 경우)
      return {
        id: doc.id,
        ...data
      } as CartItem
    })
  } catch (error) {
    console.error('장바구니 가져오기 중 오류:', error)
    throw error
  }
}

// 장바구니 아이템 추가
export const addCartItem = async (cartData: Omit<CartItem, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...cartData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return docRef.id
  } catch (error) {
    console.error('장바구니 추가 중 오류:', error)
    throw error
  }
}

// 장바구니 아이템 수정
export const updateCartItem = async (id: string, quantity: number): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, { quantity })
  } catch (error) {
    console.error('장바구니 수정 중 오류:', error)
    throw error
  }
}

// 장바구니 아이템 삭제
export const deleteCartItem = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id))
  } catch (error) {
    console.error('장바구니 삭제 중 오류:', error)
    throw error
  }
}

// 장바구니 전체 삭제 (userId 기준)
export const clearCart = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('uid', '==', userId)
    )

    const querySnapshot = await getDocs(q)
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
  } catch (error) {
    console.error('장바구니 전체 삭제 중 오류:', error)
    throw error
  }
}

// 장바구니 아이템 개수 가져오기
export const getCartItemCount = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('uid', '==', userId)
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.size
  } catch (error) {
    console.error('장바구니 개수 가져오기 중 오류:', error)
    return 0
  }
}
