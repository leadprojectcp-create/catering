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
  isVisible?: boolean  // 공지사항 노출 여부
  viewCount?: number
  createdAt?: Date | Timestamp | FieldValue
  updatedAt?: Date | Timestamp | FieldValue
  publishedAt?: Date | Timestamp | FieldValue | null
}

const COLLECTION_NAME = 'partner_notices'

// 공지사항 생성
export const createNotice = async (noticeData: Omit<Notice, 'id'>): Promise<string> => {
  try {
    // 새 공지사항이 노출되는 경우, 해당 파트너의 다른 모든 공지사항 노출 해제
    if (noticeData.isVisible) {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('partnerId', '==', noticeData.partnerId),
        where('isVisible', '==', true)
      )
      const querySnapshot = await getDocs(q)

      // 기존 노출된 공지사항들을 모두 노출 해제
      const updatePromises = querySnapshot.docs.map(document =>
        updateDoc(doc(db, COLLECTION_NAME, document.id), { isVisible: false })
      )
      await Promise.all(updatePromises)
    }

    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...noticeData,
      isVisible: noticeData.isVisible ?? true,  // 기본값: 노출
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
    // 수정하려는 공지사항이 노출되는 경우, 해당 파트너의 다른 모든 공지사항 노출 해제
    if (noticeData.isVisible) {
      // 현재 수정하려는 공지사항의 정보를 가져옴
      const currentDocSnap = await getDoc(doc(db, COLLECTION_NAME, id))
      if (currentDocSnap.exists()) {
        const currentData = currentDocSnap.data()
        const partnerId = currentData.partnerId

        // 같은 파트너의 다른 노출된 공지사항들을 찾음
        const q = query(
          collection(db, COLLECTION_NAME),
          where('partnerId', '==', partnerId),
          where('isVisible', '==', true)
        )
        const querySnapshot = await getDocs(q)

        // 현재 수정하려는 공지사항을 제외한 다른 공지사항들을 모두 노출 해제
        const updatePromises = querySnapshot.docs
          .filter(document => document.id !== id)
          .map(document =>
            updateDoc(doc(db, COLLECTION_NAME, document.id), { isVisible: false })
          )
        await Promise.all(updatePromises)
      }
    }

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
      where('isVisible', '==', true),
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
      where('isVisible', '==', true),
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
        isVisible: data.isVisible ?? true,
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
