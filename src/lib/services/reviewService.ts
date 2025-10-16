import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
  FieldValue,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ReviewReply {
  content: string
  createdAt: Date | Timestamp | FieldValue
  partnerId: string
}

export interface Review {
  id?: string
  orderId: string
  userId: string
  userName?: string
  storeId: string
  storeName: string
  productId: string
  rating: number
  content: string
  images?: string[]
  reply?: ReviewReply
  createdAt: Date | Timestamp | FieldValue
  updatedAt?: Date | Timestamp | FieldValue
}

const COLLECTION_NAME = 'reviews'

// 파트너의 모든 리뷰 가져오기 (partnerId로 상품 조회 후 리뷰 가져오기)
export const getPartnerReviews = async (partnerId: string): Promise<Review[]> => {
  try {
    // 1. 파트너의 모든 상품 ID 가져오기
    const productsQuery = query(
      collection(db, 'products'),
      where('partnerId', '==', partnerId)
    )
    const productsSnapshot = await getDocs(productsQuery)
    const productIds = productsSnapshot.docs.map(doc => doc.id)

    if (productIds.length === 0) {
      return []
    }

    // 2. 해당 상품들의 리뷰 가져오기
    // Firestore의 'in' 쿼리는 최대 10개까지만 가능하므로 분할 처리
    const reviews: Review[] = []
    const chunkSize = 10

    for (let i = 0; i < productIds.length; i += chunkSize) {
      const chunk = productIds.slice(i, i + chunkSize)
      const reviewsQuery = query(
        collection(db, COLLECTION_NAME),
        where('productId', 'in', chunk),
        orderBy('createdAt', 'desc')
      )

      const reviewsSnapshot = await getDocs(reviewsQuery)

      // 리뷰 데이터와 함께 사용자 이름 가져오기
      const chunkReviews = await Promise.all(
        reviewsSnapshot.docs.map(async (reviewDoc) => {
          const data = reviewDoc.data()

          // userId로 users 컬렉션에서 name 가져오기
          let userName = data.userName || '알 수 없음'
          try {
            const userDoc = await getDoc(doc(db, 'users', data.userId))
            if (userDoc.exists()) {
              userName = userDoc.data().name || '알 수 없음'
            }
          } catch (error) {
            console.error('사용자 정보 가져오기 실패:', error)
          }

          return {
            id: reviewDoc.id,
            orderId: data.orderId,
            userId: data.userId,
            userName: userName,
            storeId: data.storeId,
            storeName: data.storeName,
            productId: data.productId,
            rating: data.rating,
            content: data.content,
            images: data.images || [],
            reply: data.reply
              ? {
                  content: data.reply.content,
                  createdAt: data.reply.createdAt?.toDate?.() || new Date(),
                  partnerId: data.reply.partnerId
                }
              : undefined,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date()
          } as Review
        })
      )

      reviews.push(...chunkReviews)
    }

    // 생성일 기준으로 정렬
    return reviews.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
      return dateB - dateA
    })
  } catch (error) {
    console.error('리뷰 목록 가져오기 중 오류:', error)
    throw error
  }
}

// 특정 주문의 리뷰 가져오기
export const getOrderReview = async (orderId: string): Promise<Review | null> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('orderId', '==', orderId)
    )

    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) return null

    const doc = querySnapshot.docs[0]
    const data = doc.data()

    return {
      id: doc.id,
      orderId: data.orderId,
      userId: data.userId,
      userName: data.userName,
      storeId: data.storeId,
      storeName: data.storeName,
      rating: data.rating,
      content: data.content,
      images: data.images || [],
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date()
    } as Review
  } catch (error) {
    console.error('리뷰 가져오기 중 오류:', error)
    throw error
  }
}

// 단일 리뷰 가져오기
export const getReview = async (id: string): Promise<Review | null> => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id))
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        orderId: data.orderId,
        userId: data.userId,
        userName: data.userName,
        storeId: data.storeId,
        storeName: data.storeName,
        rating: data.rating,
        content: data.content,
        images: data.images || [],
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date()
      } as Review
    }
    return null
  } catch (error) {
    console.error('리뷰 가져오기 중 오류:', error)
    throw error
  }
}

// 리뷰에 답글 추가
export const addReplyToReview = async (
  reviewId: string,
  replyContent: string,
  partnerId: string
): Promise<void> => {
  try {
    const reviewRef = doc(db, COLLECTION_NAME, reviewId)
    await updateDoc(reviewRef, {
      reply: {
        content: replyContent,
        createdAt: serverTimestamp(),
        partnerId: partnerId
      }
    })
  } catch (error) {
    console.error('답글 추가 중 오류:', error)
    throw error
  }
}

// 리뷰 답글 삭제
export const deleteReplyFromReview = async (reviewId: string): Promise<void> => {
  try {
    const reviewRef = doc(db, COLLECTION_NAME, reviewId)
    await updateDoc(reviewRef, {
      reply: null
    })
  } catch (error) {
    console.error('답글 삭제 중 오류:', error)
    throw error
  }
}

// 리뷰 답글 수정
export const updateReplyInReview = async (
  reviewId: string,
  replyContent: string
): Promise<void> => {
  try {
    const reviewRef = doc(db, COLLECTION_NAME, reviewId)
    const reviewDoc = await getDoc(reviewRef)

    if (reviewDoc.exists() && reviewDoc.data().reply) {
      await updateDoc(reviewRef, {
        'reply.content': replyContent
      })
    }
  } catch (error) {
    console.error('답글 수정 중 오류:', error)
    throw error
  }
}
