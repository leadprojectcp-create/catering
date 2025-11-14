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

export interface Banner {
  id: string
  title: string
  description: string
  imageUrl?: string
  backgroundColor: string
  linkUrl?: string
  status: 'active' | 'inactive'
  displayOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

const BANNERS_COLLECTION = 'banners'

// 배너 목록 가져오기
export async function getBanners(statusFilter: string = 'all'): Promise<Banner[]> {
  try {
    const bannersRef = collection(db, BANNERS_COLLECTION)
    const q = query(bannersRef, orderBy('displayOrder', 'asc'), orderBy('createdAt', 'desc'))

    const snapshot = await getDocs(q)
    let banners = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        backgroundColor: data.backgroundColor || '#FF6B6B',
        linkUrl: data.linkUrl || '',
        status: data.status || 'inactive',
        displayOrder: data.displayOrder || 0,
        createdAt: data.createdAt || serverTimestamp(),
        updatedAt: data.updatedAt || serverTimestamp()
      } as Banner
    })

    // 클라이언트 측 필터링
    if (statusFilter !== 'all') {
      banners = banners.filter((banner) => banner.status === statusFilter)
    }

    return banners
  } catch (error) {
    console.error('배너 목록 조회 실패:', error)
    throw error
  }
}

// 활성화된 배너 가져오기 (사용자용)
export async function getActiveBanners(): Promise<Banner[]> {
  try {
    const bannersRef = collection(db, BANNERS_COLLECTION)
    const q = query(
      bannersRef,
      where('status', '==', 'active'),
      orderBy('displayOrder', 'asc')
    )

    const snapshot = await getDocs(q)
    const banners = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        backgroundColor: data.backgroundColor || '#FF6B6B',
        linkUrl: data.linkUrl || '',
        status: data.status || 'inactive',
        displayOrder: data.displayOrder || 0,
        createdAt: data.createdAt || serverTimestamp(),
        updatedAt: data.updatedAt || serverTimestamp()
      } as Banner
    })

    return banners
  } catch (error) {
    console.error('활성 배너 조회 실패:', error)
    throw error
  }
}

// 배너 상세 조회
export async function getBanner(id: string): Promise<Banner | null> {
  try {
    const bannerRef = doc(db, BANNERS_COLLECTION, id)
    const bannerDoc = await getDoc(bannerRef)

    if (!bannerDoc.exists()) {
      return null
    }

    const data = bannerDoc.data()
    return {
      id: bannerDoc.id,
      title: data.title || '',
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      backgroundColor: data.backgroundColor || '#FF6B6B',
      linkUrl: data.linkUrl || '',
      status: data.status || 'inactive',
      displayOrder: data.displayOrder || 0,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    } as Banner
  } catch (error) {
    console.error('배너 조회 실패:', error)
    throw error
  }
}

// 배너 생성
export async function createBanner(
  bannerData: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const bannersRef = collection(db, BANNERS_COLLECTION)
    const newBannerRef = doc(bannersRef)

    await setDoc(newBannerRef, {
      ...bannerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return newBannerRef.id
  } catch (error) {
    console.error('배너 생성 실패:', error)
    throw error
  }
}

// 배너 수정
export async function updateBanner(
  id: string,
  bannerData: Partial<Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const bannerRef = doc(db, BANNERS_COLLECTION, id)

    const updateData: Record<string, unknown> = {
      ...bannerData,
      updatedAt: serverTimestamp()
    }

    await setDoc(bannerRef, updateData, { merge: true })
  } catch (error) {
    console.error('배너 수정 실패:', error)
    throw error
  }
}

// 배너 삭제
export async function deleteBanner(id: string): Promise<void> {
  try {
    const bannerRef = doc(db, BANNERS_COLLECTION, id)
    await deleteDoc(bannerRef)
  } catch (error) {
    console.error('배너 삭제 실패:', error)
    throw error
  }
}

// 배너 상태 토글
export async function toggleBannerStatus(id: string, currentStatus: string): Promise<void> {
  try {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await updateBanner(id, { status: newStatus })
  } catch (error) {
    console.error('배너 상태 변경 실패:', error)
    throw error
  }
}
