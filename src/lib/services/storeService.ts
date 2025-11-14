import { db } from '@/lib/firebase'
import {
  doc,
  updateDoc,
  increment,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

const VIEWED_STORES_KEY = 'viewed_stores'
const VIEW_EXPIRY_HOURS = 24

interface ViewedStore {
  storeId: string
  timestamp: number
}

/**
 * 로컬스토리지에서 조회한 스토어 목록 가져오기
 */
const getViewedStores = (): ViewedStore[] => {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(VIEWED_STORES_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error reading viewed stores:', error)
    return []
  }
}

/**
 * 로컬스토리지에 조회한 스토어 저장
 */
const saveViewedStore = (storeId: string) => {
  if (typeof window === 'undefined') return

  try {
    const viewedStores = getViewedStores()
    const now = Date.now()

    // 기존 항목 제거
    const filtered = viewedStores.filter(item => item.storeId !== storeId)

    // 새 항목 추가
    filtered.push({ storeId, timestamp: now })

    // 24시간 지난 항목 제거
    const expiryTime = now - (VIEW_EXPIRY_HOURS * 60 * 60 * 1000)
    const cleaned = filtered.filter(item => item.timestamp > expiryTime)

    localStorage.setItem(VIEWED_STORES_KEY, JSON.stringify(cleaned))
  } catch (error) {
    console.error('Error saving viewed store:', error)
  }
}

/**
 * 최근 24시간 내에 조회한 스토어인지 확인
 */
const hasViewedRecently = (storeId: string): boolean => {
  const viewedStores = getViewedStores()
  const now = Date.now()
  const expiryTime = now - (VIEW_EXPIRY_HOURS * 60 * 60 * 1000)

  const recentView = viewedStores.find(
    item => item.storeId === storeId && item.timestamp > expiryTime
  )

  return !!recentView
}

/**
 * 스토어 조회수 증가
 * 24시간 내 중복 조회는 카운트하지 않음
 */
export const incrementStoreView = async (storeId: string): Promise<void> => {
  try {
    // 최근 조회 여부 확인
    if (hasViewedRecently(storeId)) {
      console.log(`Store ${storeId} already viewed in last ${VIEW_EXPIRY_HOURS} hours`)
      return
    }

    // Firestore 조회수 증가
    const storeRef = doc(db, 'stores', storeId)
    await updateDoc(storeRef, {
      viewCount: increment(1),
      lastViewedAt: new Date()
    })

    // 로컬스토리지에 저장
    saveViewedStore(storeId)

    console.log(`Store ${storeId} view count incremented`)
  } catch (error) {
    console.error('Error incrementing store view:', error)
    // 에러가 발생해도 사용자 경험에 영향 없도록 조용히 처리
  }
}

/**
 * 사용자가 특정 스토어를 좋아요했는지 확인
 */
export const checkUserLiked = async (userId: string, storeId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'likes'),
      where('userId', '==', userId),
      where('storeId', '==', storeId)
    )
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error) {
    console.error('Error checking user like:', error)
    return false
  }
}

/**
 * 사용자가 좋아요한 모든 스토어 ID 목록 가져오기
 */
export const getUserLikedStoreIds = async (userId: string): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'likes'),
      where('userId', '==', userId)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => doc.data().storeId)
  } catch (error) {
    console.error('Error getting user liked stores:', error)
    return []
  }
}

/**
 * 스토어 좋아요 추가
 */
export const addStoreLike = async (
  userId: string,
  storeId: string,
  storeName: string,
  storeImage?: string
): Promise<void> => {
  try {
    // likes 컬렉션에 추가
    await addDoc(collection(db, 'likes'), {
      userId,
      storeId,
      storeName,
      storeImage: storeImage || null,
      likedAt: serverTimestamp()
    })

    // stores의 likeCount 증가
    const storeRef = doc(db, 'stores', storeId)
    await updateDoc(storeRef, {
      likeCount: increment(1)
    })

    console.log(`User ${userId} liked store ${storeId}`)
  } catch (error) {
    console.error('Error adding store like:', error)
    throw error
  }
}

/**
 * 스토어 좋아요 제거
 */
export const removeStoreLike = async (userId: string, storeId: string): Promise<void> => {
  try {
    // likes 컬렉션에서 찾아서 삭제
    const q = query(
      collection(db, 'likes'),
      where('userId', '==', userId),
      where('storeId', '==', storeId)
    )
    const querySnapshot = await getDocs(q)

    // 모든 매칭되는 문서 삭제 (보통 1개)
    const deletePromises = querySnapshot.docs.map(docSnapshot =>
      deleteDoc(doc(db, 'likes', docSnapshot.id))
    )
    await Promise.all(deletePromises)

    // stores의 likeCount 감소
    const storeRef = doc(db, 'stores', storeId)
    await updateDoc(storeRef, {
      likeCount: increment(-1)
    })

    console.log(`User ${userId} unliked store ${storeId}`)
  } catch (error) {
    console.error('Error removing store like:', error)
    throw error
  }
}

/**
 * 스토어 좋아요 토글 (추가/제거)
 */
export const toggleStoreLike = async (
  userId: string,
  storeId: string,
  storeName: string,
  storeImage?: string
): Promise<boolean> => {
  try {
    const isLiked = await checkUserLiked(userId, storeId)

    if (isLiked) {
      await removeStoreLike(userId, storeId)
      return false
    } else {
      await addStoreLike(userId, storeId, storeName, storeImage)
      return true
    }
  } catch (error) {
    console.error('Error toggling store like:', error)
    throw error
  }
}

/**
 * 사용자가 좋아요한 스토어 목록 가져오기 (상세 정보 포함)
 */
export interface LikedStore {
  id: string
  storeId: string
  storeName: string
  storeImage?: string
  likedAt: Timestamp | string
}

export const getUserLikedStores = async (userId: string): Promise<LikedStore[]> => {
  try {
    const q = query(
      collection(db, 'likes'),
      where('userId', '==', userId)
    )
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LikedStore))
  } catch (error) {
    console.error('Error getting user liked stores:', error)
    return []
  }
}
