import { db } from '@/lib/firebase'
import { collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, orderBy, limit, increment, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore'
import { auth } from '@/lib/firebase'

export interface ProductData {
  name: string
  images: string[]
  price: number
  category?: string
  productTypes?: string[]
  optionsEnabled: boolean
  options: {
    groupName: string
    values: {
      name: string
      price: number
    }[]
  }[]
  additionalOptionsEnabled: boolean
  additionalOptions?: {
    groupName: string
    values: {
      name: string
      price: number
    }[]
  }[]
  description: string
  minOrderQuantity: number
  maxOrderQuantity: number
  quantityRanges?: {
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]
  deliveryMethods: {
    quick: boolean
    parcel: boolean
    pickup: boolean
  }
  additionalSettings: {
    sameDayDelivery: boolean
    thermalPack: boolean
    stickerCustom: boolean
    giftItem: boolean
  }
  origin: { ingredient: string, origin: string }[]
  orderType: string
  partnerId?: string
  partnerEmail?: string
  storeId?: string
  status?: string
  viewCount?: number
  orderCount?: number
  createdAt?: Timestamp | FieldValue
  updatedAt?: Timestamp | FieldValue
  discount?: {
    type: 'amount' | 'percent'
    value: number
    startDate: string | null
    endDate: string | null
    isAlwaysActive: boolean
  }
  discountedPrice?: number
  quickDeliveryFeeSettings?: {
    type: '무료' | '조건부 무료' | '유료'
    freeCondition?: number
    maxSupport?: number
  }
  deliveryFeeSettings?: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    paymentMethods?: ('선결제' | '착불')[]
    perQuantity?: number
  }
}

// 상품 등록
export async function createProduct(productData: Omit<ProductData, 'partnerId' | 'partnerEmail' | 'storeId' | 'status' | 'viewCount' | 'orderCount' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  // 사용자 이메일 가져오기
  let userEmail = user.email

  // 이메일이 없으면 Firestore users 컬렉션에서 가져오기
  if (!userEmail) {
    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (userDoc.exists()) {
      userEmail = userDoc.data().email
    }
  }

  // 그래도 이메일이 없으면 빈 문자열 사용
  if (!userEmail) {
    userEmail = ''
  }

  // storeId는 partnerId와 동일 (user.uid)
  const storeId = user.uid

  const completeProductData: ProductData = {
    ...productData,
    partnerId: user.uid,
    partnerEmail: userEmail,
    storeId: storeId,
    status: 'pending',
    viewCount: 0,
    orderCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  // undefined 값 제거
  const cleanData = Object.fromEntries(
    Object.entries(completeProductData).filter(([_, v]) => v !== undefined)
  )

  const docRef = await addDoc(collection(db, 'products'), cleanData)
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

  // 관리자 권한 확인
  const userDoc = await getDoc(doc(db, 'users', user.uid))
  const isAdmin = userDoc.exists() && userDoc.data()?.level === 10

  // 관리자가 아니면 본인 상품만 수정 가능
  if (!isAdmin && existingData.partnerId !== user.uid) {
    throw new Error('수정 권한이 없습니다.')
  }

  // undefined 값만 제거 (빈 배열은 유효한 값이므로 유지)
  const updateData = Object.fromEntries(
    Object.entries({
      ...productData,
      updatedAt: serverTimestamp()
    }).filter(([_, v]) => v !== undefined)
  )

  // 배열 필드는 명시적으로 덮어쓰기 (병합이 아닌 교체)
  if (productData.additionalSettings !== undefined) {
    updateData.additionalSettings = productData.additionalSettings
  }
  if (productData.deliveryMethods !== undefined) {
    updateData.deliveryMethods = productData.deliveryMethods
  }
  if (productData.productTypes !== undefined) {
    updateData.productTypes = productData.productTypes
  }
  if (productData.options !== undefined) {
    updateData.options = productData.options
  }
  // additionalOptions는 명시적으로 전달된 경우 덮어쓰기 (빈 배열 포함)
  if ('additionalOptions' in productData) {
    updateData.additionalOptions = productData.additionalOptions || []
  }
  if (productData.origin !== undefined) {
    updateData.origin = productData.origin
  }
  if (productData.images !== undefined) {
    updateData.images = productData.images
  }

  await updateDoc(productRef, updateData)
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

// 상품 상태 변경 (active, inactive, pending)
export async function updateProductStatus(productId: string, status: 'active' | 'inactive' | 'pending'): Promise<void> {
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

  // 관리자 권한 확인
  const userDoc = await getDoc(doc(db, 'users', user.uid))
  const isAdmin = userDoc.exists() && userDoc.data()?.level === 10

  // 관리자가 아니면 본인 상품만 수정 가능
  if (!isAdmin && existingData.partnerId !== user.uid) {
    throw new Error('수정 권한이 없습니다.')
  }

  await updateDoc(productRef, {
    status,
    updatedAt: serverTimestamp()
  })
}

/**
 * 사용자가 특정 제품을 좋아요했는지 확인
 */
export async function checkUserLikedProduct(userId: string, productId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'likes'),
      where('userId', '==', userId),
      where('productId', '==', productId)
    )
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error('좋아요 상태 확인 실패:', error)
    return false
  }
}

/**
 * 제품 좋아요 추가
 */
export async function addProductLike(
  userId: string,
  productId: string,
  productName: string,
  productImage?: string
): Promise<void> {
  try {
    // likes 컬렉션에 추가
    await addDoc(collection(db, 'likes'), {
      userId,
      productId,
      productName,
      productImage: productImage || null,
      likedAt: serverTimestamp()
    })

    // products의 likeCount 증가
    const productRef = doc(db, 'products', productId)
    await updateDoc(productRef, {
      likeCount: increment(1)
    })

    console.log(`User ${userId} liked product ${productId}`)
  } catch (error) {
    console.error('좋아요 추가 실패:', error)
    throw error
  }
}

/**
 * 제품 좋아요 제거
 */
export async function removeProductLike(userId: string, productId: string): Promise<void> {
  try {
    // likes 컬렉션에서 찾아서 삭제
    const q = query(
      collection(db, 'likes'),
      where('userId', '==', userId),
      where('productId', '==', productId)
    )
    const querySnapshot = await getDocs(q)

    // 모든 매칭되는 문서 삭제 (보통 1개)
    const deletePromises = querySnapshot.docs.map(docSnapshot =>
      deleteDoc(doc(db, 'likes', docSnapshot.id))
    )
    await Promise.all(deletePromises)

    // products의 likeCount 감소
    const productRef = doc(db, 'products', productId)
    await updateDoc(productRef, {
      likeCount: increment(-1)
    })

    console.log(`User ${userId} unliked product ${productId}`)
  } catch (error) {
    console.error('좋아요 제거 실패:', error)
    throw error
  }
}

/**
 * 제품 좋아요 토글 (추가/제거)
 */
export async function toggleProductLike(
  userId: string,
  productId: string,
  productName: string,
  productImage?: string
): Promise<boolean> {
  try {
    const isLiked = await checkUserLikedProduct(userId, productId)

    if (isLiked) {
      await removeProductLike(userId, productId)
      return false
    } else {
      await addProductLike(userId, productId, productName, productImage)
      return true
    }
  } catch (error) {
    console.error('좋아요 토글 실패:', error)
    throw error
  }
}