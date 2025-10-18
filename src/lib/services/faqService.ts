import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  QueryConstraint,
  Timestamp,
  FieldValue
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

const COLLECTION_NAME = 'faqs'

export type FaqCategory = 'store_account' | 'order' | 'delivery' | 'settlement' | 'review' | 'withdrawal'
export type FaqTargetType = 'all' | 'user' | 'partner'

export interface Faq {
  id: string
  question: string
  answer: string
  category: FaqCategory
  targetType: FaqTargetType
  order: number
  status: 'draft' | 'published'
  author: string
  authorId: string
  createdAt?: Date | Timestamp | FieldValue
  updatedAt?: Date | Timestamp | FieldValue
  publishedAt?: Date | Timestamp | FieldValue | null
}

// FAQ 생성
export const createFaq = async (faqData: Omit<Faq, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...faqData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: faqData.status === 'published' ? serverTimestamp() : null
    })
    return docRef.id
  } catch (error) {
    console.error('FAQ 생성 중 오류:', error)
    throw error
  }
}

// FAQ 수정
export const updateFaq = async (id: string, faqData: Partial<Faq>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: Record<string, unknown> = {
      ...faqData,
      updatedAt: serverTimestamp()
    }

    // 상태가 published로 변경되고 publishedAt이 없으면 설정
    if (faqData.status === 'published' && !faqData.publishedAt) {
      updateData.publishedAt = serverTimestamp()
    }

    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('FAQ 수정 중 오류:', error)
    throw error
  }
}

// FAQ 삭제
export const deleteFaq = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id))
  } catch (error) {
    console.error('FAQ 삭제 중 오류:', error)
    throw error
  }
}

// 단일 FAQ 가져오기
export const getFaq = async (id: string): Promise<Faq | null> => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id))
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Faq
    }
    return null
  } catch (error) {
    console.error('FAQ 가져오기 중 오류:', error)
    throw error
  }
}

// 모든 FAQ 가져오기 (관리자용)
export const getFaqs = async (
  filterStatus?: string,
  filterCategory?: string
): Promise<Faq[]> => {
  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'))

    const constraints: QueryConstraint[] = []

    // 상태 필터
    if (filterStatus && filterStatus !== 'all') {
      constraints.push(where('status', '==', filterStatus))
    }

    // 카테고리 필터
    if (filterCategory && filterCategory !== 'all') {
      constraints.push(where('category', '==', filterCategory))
    }

    if (constraints.length > 0) {
      constraints.push(orderBy('order', 'asc'))
      q = query(collection(db, COLLECTION_NAME), ...constraints)
    }

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Faq))
  } catch (error) {
    console.error('FAQ 목록 가져오기 중 오류:', error)
    throw error
  }
}

// 게시된 FAQ만 가져오기 (사용자용)
export const getPublishedFaqs = async (
  targetType?: FaqTargetType,
  category?: FaqCategory
): Promise<Faq[]> => {
  try {
    const constraints: QueryConstraint[] = [where('status', '==', 'published')]

    if (targetType) {
      // targetType이 'all'이거나 지정된 타입인 FAQ만 가져오기
      constraints.push(where('targetType', 'in', ['all', targetType]))
    }

    if (category) {
      constraints.push(where('category', '==', category))
    }

    constraints.push(orderBy('order', 'asc'))

    const q = query(collection(db, COLLECTION_NAME), ...constraints)

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Faq))
  } catch (error) {
    console.error('게시된 FAQ 가져오기 중 오류:', error)
    throw error
  }
}
