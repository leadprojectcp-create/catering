import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

export interface Popup {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string
  targetType: 'all' | 'partner' | 'user' // 대상: 전체, 파트너, 일반 유저
  status: 'active' | 'inactive' // 활성화 상태
  startDate: Timestamp
  endDate: Timestamp
  displayOrder: number // 표시 순서 (낮을수록 먼저 표시)
  createdAt: Timestamp
  updatedAt: Timestamp
}

const POPUPS_COLLECTION = 'popups'

// 팝업 목록 가져오기
export async function getPopups(
  statusFilter: string = 'all',
  targetTypeFilter: string = 'all'
): Promise<Popup[]> {
  try {
    const popupsRef = collection(db, POPUPS_COLLECTION)
    const q = query(popupsRef, orderBy('displayOrder', 'asc'), orderBy('createdAt', 'desc'))

    const snapshot = await getDocs(q)
    let popups = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || '',
        imageUrl: data.imageUrl || '',
        linkUrl: data.linkUrl || '',
        targetType: data.targetType || 'all',
        status: data.status || 'inactive',
        startDate: data.startDate,
        endDate: data.endDate,
        displayOrder: data.displayOrder || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as Popup
    })

    // 클라이언트 측 필터링
    if (statusFilter !== 'all') {
      popups = popups.filter((popup) => popup.status === statusFilter)
    }

    if (targetTypeFilter !== 'all') {
      popups = popups.filter((popup) => popup.targetType === targetTypeFilter)
    }

    return popups
  } catch (error) {
    console.error('팝업 목록 조회 실패:', error)
    throw error
  }
}

// 활성화된 팝업 가져오기 (사용자용)
export async function getActivePopups(targetType: 'all' | 'partner' | 'user'): Promise<Popup[]> {
  try {
    const popupsRef = collection(db, POPUPS_COLLECTION)
    const now = Timestamp.now()

    const q = query(
      popupsRef,
      where('status', '==', 'active'),
      orderBy('displayOrder', 'asc')
    )

    const snapshot = await getDocs(q)
    const popups = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || '',
          imageUrl: data.imageUrl || '',
          linkUrl: data.linkUrl || '',
          targetType: data.targetType || 'all',
          status: data.status || 'inactive',
          startDate: data.startDate,
          endDate: data.endDate,
          displayOrder: data.displayOrder || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        } as Popup
      })
      .filter((popup) => {
        // Timestamp 타입 확인 및 날짜 범위 체크
        if (!(popup.startDate instanceof Timestamp) || !(popup.endDate instanceof Timestamp)) {
          console.warn('Popup has invalid date format:', popup.id)
          return false
        }

        const isInDateRange = popup.startDate.toMillis() <= now.toMillis() && popup.endDate.toMillis() >= now.toMillis()
        // 대상 타입 체크 (all이거나 지정된 타입과 일치)
        const isTargetMatch = popup.targetType === 'all' || popup.targetType === targetType
        return isInDateRange && isTargetMatch
      })

    return popups
  } catch (error) {
    console.error('활성 팝업 조회 실패:', error)
    throw error
  }
}

// 팝업 상세 조회
export async function getPopup(id: string): Promise<Popup | null> {
  try {
    const popupRef = doc(db, POPUPS_COLLECTION, id)
    const popupDoc = await getDoc(popupRef)

    if (!popupDoc.exists()) {
      return null
    }

    const data = popupDoc.data()
    return {
      id: popupDoc.id,
      title: data.title || '',
      imageUrl: data.imageUrl || '',
      linkUrl: data.linkUrl || '',
      targetType: data.targetType || 'all',
      status: data.status || 'inactive',
      startDate: data.startDate,
      endDate: data.endDate,
      displayOrder: data.displayOrder || 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as Popup
  } catch (error) {
    console.error('팝업 조회 실패:', error)
    throw error
  }
}

// 팝업 생성
export async function createPopup(
  popupData: Omit<Popup, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const popupsRef = collection(db, POPUPS_COLLECTION)
    const newPopupRef = doc(popupsRef)

    await setDoc(newPopupRef, {
      ...popupData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return newPopupRef.id
  } catch (error) {
    console.error('팝업 생성 실패:', error)
    throw error
  }
}

// 팝업 수정
export async function updatePopup(
  id: string,
  popupData: Partial<Omit<Popup, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const popupRef = doc(db, POPUPS_COLLECTION, id)

    const updateData: Record<string, unknown> = {
      ...popupData,
      updatedAt: serverTimestamp()
    }

    await setDoc(popupRef, updateData, { merge: true })
  } catch (error) {
    console.error('팝업 수정 실패:', error)
    throw error
  }
}

// 팝업 삭제
export async function deletePopup(id: string): Promise<void> {
  try {
    const popupRef = doc(db, POPUPS_COLLECTION, id)
    await deleteDoc(popupRef)
  } catch (error) {
    console.error('팝업 삭제 실패:', error)
    throw error
  }
}

// 팝업 상태 토글
export async function togglePopupStatus(id: string, currentStatus: string): Promise<void> {
  try {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await updatePopup(id, { status: newStatus })
  } catch (error) {
    console.error('팝업 상태 변경 실패:', error)
    throw error
  }
}
