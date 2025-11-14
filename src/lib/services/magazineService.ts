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
  Timestamp,
  FieldValue,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Magazine {
  id?: string
  title: string
  subtitle?: string
  content: string
  author: string
  authorId: string
  coverImage?: string
  images?: string[]
  category: string
  tags?: string[]
  status: 'draft' | 'published' | 'archived'
  viewCount?: number
  likeCount?: number
  publishedAt?: Timestamp | null
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

const COLLECTION_NAME = 'magazines'

// 매거진 생성
export const createMagazine = async (magazineData: Omit<Magazine, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...magazineData,
      viewCount: 0,
      likeCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: magazineData.status === 'published' ? serverTimestamp() : null
    })
    return docRef.id
  } catch (error) {
    console.error('매거진 생성 중 오류:', error)
    throw error
  }
}

// 매거진 수정
export const updateMagazine = async (id: string, magazineData: Partial<Magazine>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: Record<string, unknown> = {
      ...magazineData,
      updatedAt: serverTimestamp()
    }

    // 상태가 published로 변경되고 publishedAt이 없으면 설정
    if (magazineData.status === 'published' && !magazineData.publishedAt) {
      updateData.publishedAt = serverTimestamp()
    }

    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('매거진 수정 중 오류:', error)
    throw error
  }
}

// 매거진 삭제
export const deleteMagazine = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id))
  } catch (error) {
    console.error('매거진 삭제 중 오류:', error)
    throw error
  }
}

// 단일 매거진 가져오기
export const getMagazine = async (id: string): Promise<Magazine | null> => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id))
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Magazine
    }
    return null
  } catch (error) {
    console.error('매거진 가져오기 중 오류:', error)
    throw error
  }
}

// 모든 매거진 가져오기 (관리자용)
export const getMagazines = async (filterStatus?: string): Promise<Magazine[]> => {
  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))

    if (filterStatus && filterStatus !== 'all') {
      q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', filterStatus),
        orderBy('createdAt', 'desc')
      )
    }

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Magazine))
  } catch (error) {
    console.error('매거진 목록 가져오기 중 오류:', error)
    throw error
  }
}

// 게시된 매거진만 가져오기 (사용자용)
export const getPublishedMagazines = async (): Promise<Magazine[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Magazine))
  } catch (error) {
    console.error('게시된 매거진 가져오기 중 오류:', error)
    throw error
  }
}

// 조회수 증가
export const incrementViewCount = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const currentCount = docSnap.data().viewCount || 0
      await updateDoc(docRef, {
        viewCount: currentCount + 1
      })
    }
  } catch (error) {
    console.error('조회수 증가 중 오류:', error)
  }
}

// 좋아요 토글
export const toggleLike = async (id: string, increment: boolean): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const currentCount = docSnap.data().likeCount || 0
      await updateDoc(docRef, {
        likeCount: increment ? currentCount + 1 : Math.max(0, currentCount - 1)
      })
    }
  } catch (error) {
    console.error('좋아요 토글 중 오류:', error)
    throw error
  }
}