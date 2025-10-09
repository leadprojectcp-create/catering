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
  serverTimestamp,
  FieldValue
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Notice {
  id?: string
  title: string
  content: string
  author: string
  authorId: string
  partnerId: string  // 파트너 ID (작성자)
  status: 'draft' | 'published' | 'archived'
  viewCount?: number
  createdAt?: Date | Timestamp | FieldValue
  updatedAt?: Date | Timestamp | FieldValue
  publishedAt?: Date | Timestamp | FieldValue | null
}

const COLLECTION_NAME = 'notices'

// 공지사항 생성
export const createNotice = async (noticeData: Omit<Notice, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...noticeData,
      viewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: noticeData.status === 'published' ? serverTimestamp() : null
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
    const updateData: Record<string, unknown> = {
      ...noticeData,
      updatedAt: serverTimestamp()
    }

    // 상태가 published로 변경되고 publishedAt이 없으면 설정
    if (noticeData.status === 'published' && !noticeData.publishedAt) {
      updateData.publishedAt = serverTimestamp()
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

// 파트너의 모든 공지사항 가져오기
export const getPartnerNotices = async (partnerId: string, filterStatus?: string): Promise<Notice[]> => {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      where('partnerId', '==', partnerId),
      orderBy('createdAt', 'desc')
    )

    if (filterStatus && filterStatus !== 'all') {
      q = query(
        collection(db, COLLECTION_NAME),
        where('partnerId', '==', partnerId),
        where('status', '==', filterStatus),
        orderBy('createdAt', 'desc')
      )
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

// 게시된 공지사항만 가져오기 (관리자용 - 모든 파트너)
export const getPublishedNotices = async (partnerId: string): Promise<Notice[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('partnerId', '==', partnerId),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    )

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

// 특정 파트너의 게시된 공지사항만 가져오기 (사용자용)
export const getPublishedNoticesByPartner = async (partnerId: string): Promise<Notice[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('partnerId', '==', partnerId),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        content: data.content,
        author: data.author,
        authorId: data.authorId,
        partnerId: data.partnerId,
        status: data.status,
        viewCount: data.viewCount || 0,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        publishedAt: data.publishedAt?.toDate?.() || null
      } as Notice
    })
  } catch (error) {
    console.error('파트너 공지사항 가져오기 중 오류:', error)
    return []
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
