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
  QueryConstraint,
  Timestamp,
  FieldValue
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

const COLLECTION_NAME = 'notices'

export type NoticeTargetType = 'all' | 'partner' | 'user'
export type NoticeCategory = 'general' | 'event'

export interface Notice {
  id: string
  title: string
  content: string
  summary?: string
  targetType: NoticeTargetType
  category: NoticeCategory
  author: string
  authorId: string
  status: 'draft' | 'published'
  viewCount?: number
  createdAt?: Date | Timestamp | FieldValue
  updatedAt?: Date | Timestamp | FieldValue
  publishedAt?: Date | Timestamp | FieldValue | null
}

// 공지사항 생성
export const createNotice = async (noticeData: Omit<Notice, 'id'>): Promise<string> => {
  try {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...noticeData,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: noticeData.status === 'published' ? now : null
    })
    return docRef.id
  } catch (error) {
    console.error('공지사항 생성 중 오류:', error)
    throw error
  }
}

// 공지사항 수정
export const updateNotice = async (id: string, noticeData: Partial<Notice>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = {
      ...noticeData,
      updatedAt: now
    }

    // 상태가 published로 변경되고 publishedAt이 없으면 설정
    if (noticeData.status === 'published' && !noticeData.publishedAt) {
      updateData.publishedAt = now
    }

    await updateDoc(docRef, updateData)
  } catch (error) {
    console.error('공지사항 수정 중 오류:', error)
    throw error
  }
}

// 공지사항 삭제
export const deleteNotice = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id))
  } catch (error) {
    console.error('공지사항 삭제 중 오류:', error)
    throw error
  }
}

// 단일 공지사항 가져오기
export const getNotice = async (id: string): Promise<Notice | null> => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id))
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Notice
    }
    return null
  } catch (error) {
    console.error('공지사항 가져오기 중 오류:', error)
    throw error
  }
}

// 모든 공지사항 가져오기 (관리자용)
export const getNotices = async (
  filterStatus?: string,
  filterTargetType?: string
): Promise<Notice[]> => {
  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))

    // 상태 필터
    if (filterStatus && filterStatus !== 'all') {
      q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', filterStatus),
        orderBy('createdAt', 'desc')
      )
    }

    // 대상 타입 필터 (상태 필터와 함께 사용할 경우)
    if (filterTargetType && filterTargetType !== 'all') {
      const constraints: QueryConstraint[] = [where('targetType', '==', filterTargetType)]
      if (filterStatus && filterStatus !== 'all') {
        constraints.push(where('status', '==', filterStatus))
      }
      constraints.push(orderBy('createdAt', 'desc'))
      q = query(collection(db, COLLECTION_NAME), ...constraints)
    }

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notice))
  } catch (error) {
    console.error('공지사항 목록 가져오기 중 오류:', error)
    throw error
  }
}

// 게시된 공지사항만 가져오기 (사용자용)
export const getPublishedNotices = async (
  targetType?: NoticeTargetType
): Promise<Notice[]> => {
  try {
    const constraints: QueryConstraint[] = [where('status', '==', 'published')]

    if (targetType) {
      constraints.push(where('targetType', 'in', [targetType, 'all']))
    }

    constraints.push(orderBy('publishedAt', 'desc'))

    const q = query(collection(db, COLLECTION_NAME), ...constraints)

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notice))
  } catch (error) {
    console.error('게시된 공지사항 가져오기 중 오류:', error)
    throw error
  }
}

// 조회수 증가
export const incrementNoticeViewCount = async (id: string): Promise<void> => {
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
