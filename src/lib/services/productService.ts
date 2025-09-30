import { db } from '@/lib/firebase'
import { collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore'
import { auth } from '@/lib/firebase'

export interface ProductData {
  name: string
  images: string[]
  price: number
  options: {
    groupName: string
    values: {
      name: string
      price: number
    }[]
  }[]
  description: string
  minOrderQuantity: number
  maxOrderQuantity: number
  deliveryMethods: {
    self: boolean
    quick: boolean
    pickup: boolean
  }
  additionalSettings: {
    sameDayDelivery: boolean
    thermalPack: boolean
    stickerCustom: boolean
  }
  origin: { ingredient: string, origin: string }[]
  orderType: string
  partnerId?: string
  partnerEmail?: string
  status?: string
  viewCount?: number
  orderCount?: number
  createdAt?: string
  updatedAt?: string
}

// 상품 등록
export async function createProduct(productData: Omit<ProductData, 'partnerId' | 'partnerEmail' | 'status' | 'viewCount' | 'orderCount' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  console.log('Current user email:', user.email) // 디버깅용 로그

  const completeProductData: ProductData = {
    ...productData,
    partnerId: user.uid,
    partnerEmail: user.email || 'no-email', // 이메일이 없으면 'no-email'로 저장
    status: 'active',
    viewCount: 0,
    orderCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  console.log('Product data to save:', completeProductData) // 저장될 데이터 확인

  const docRef = await addDoc(collection(db, 'products'), completeProductData)
  console.log('Product created with ID:', docRef.id, 'with email:', completeProductData.partnerEmail)

  return docRef.id
}

// 상품 수정
export async function updateProduct(productId: string, productData: Partial<ProductData>): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const productRef = doc(db, 'products', productId)

  // 권한 확인
  const productDoc = await getDoc(productRef)
  if (!productDoc.exists()) {
    throw new Error('상품을 찾을 수 없습니다.')
  }

  const existingData = productDoc.data()
  if (existingData.partnerId !== user.uid) {
    throw new Error('수정 권한이 없습니다.')
  }

  await updateDoc(productRef, {
    ...productData,
    updatedAt: new Date().toISOString()
  })
}

// 상품 삭제
export async function deleteProduct(productId: string): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const productRef = doc(db, 'products', productId)

  // 권한 확인
  const productDoc = await getDoc(productRef)
  if (!productDoc.exists()) {
    throw new Error('상품을 찾을 수 없습니다.')
  }

  const existingData = productDoc.data()
  if (existingData.partnerId !== user.uid) {
    throw new Error('삭제 권한이 없습니다.')
  }

  await deleteDoc(productRef)
}

// 파트너의 상품 목록 조회
export async function getPartnerProducts(partnerId?: string): Promise<ProductData[]> {
  const uid = partnerId || auth.currentUser?.uid
  if (!uid) {
    throw new Error('파트너 ID가 필요합니다.')
  }

  const q = query(
    collection(db, 'products'),
    where('partnerId', '==', uid),
    orderBy('createdAt', 'desc')
  )

  const querySnapshot = await getDocs(q)
  const products: ProductData[] = []

  querySnapshot.forEach((doc) => {
    products.push({
      ...doc.data() as ProductData,
      id: doc.id
    } as ProductData)
  })

  return products
}

// 단일 상품 조회
export async function getProduct(productId: string): Promise<ProductData | null> {
  const productRef = doc(db, 'products', productId)
  const productDoc = await getDoc(productRef)

  if (!productDoc.exists()) {
    return null
  }

  return {
    ...productDoc.data() as ProductData,
    id: productDoc.id
  } as ProductData
}

// 모든 활성 상품 조회 (고객용)
export async function getActiveProducts(limitCount?: number): Promise<ProductData[]> {
  let q = query(
    collection(db, 'products'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  )

  if (limitCount) {
    q = query(
      collection(db, 'products'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
  }

  const querySnapshot = await getDocs(q)
  const products: ProductData[] = []

  querySnapshot.forEach((doc) => {
    products.push({
      ...doc.data() as ProductData,
      id: doc.id
    } as ProductData)
  })

  return products
}

// 상품 조회수 증가
export async function incrementProductView(productId: string): Promise<void> {
  const productRef = doc(db, 'products', productId)
  const productDoc = await getDoc(productRef)

  if (!productDoc.exists()) {
    throw new Error('상품을 찾을 수 없습니다.')
  }

  const currentViewCount = productDoc.data().viewCount || 0
  await updateDoc(productRef, {
    viewCount: currentViewCount + 1
  })
}

// 상품 상태 변경 (active, inactive, soldout)
export async function updateProductStatus(productId: string, status: 'active' | 'inactive' | 'soldout'): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const productRef = doc(db, 'products', productId)

  // 권한 확인
  const productDoc = await getDoc(productRef)
  if (!productDoc.exists()) {
    throw new Error('상품을 찾을 수 없습니다.')
  }

  const existingData = productDoc.data()
  if (existingData.partnerId !== user.uid) {
    throw new Error('수정 권한이 없습니다.')
  }

  await updateDoc(productRef, {
    status,
    updatedAt: new Date().toISOString()
  })
}