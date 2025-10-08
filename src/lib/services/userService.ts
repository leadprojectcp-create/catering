import { collection, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface User {
  uid: string
  email: string
  name?: string
  phone?: string
  type?: 'partner' | 'user' | 'admin'
  createdAt?: any
  lastLoginAt?: any
  disabled?: boolean
}

const COLLECTION_NAME = 'users'

// 모든 사용자 가져오기
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as User))
  } catch (error) {
    console.error('사용자 목록 조회 실패:', error)
    throw error
  }
}

// 타입별 사용자 가져오기
export const getUsersByType = async (type: 'partner' | 'user' | 'admin'): Promise<User[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('type', '==', type),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as User))
  } catch (error) {
    console.error('타입별 사용자 조회 실패:', error)
    throw error
  }
}

// 사용자 타입 업데이트
export const updateUserType = async (uid: string, type: 'partner' | 'user' | 'admin'): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, uid)
    await updateDoc(userRef, { type })
  } catch (error) {
    console.error('사용자 타입 업데이트 실패:', error)
    throw error
  }
}

// 사용자 비활성화/활성화
export const toggleUserStatus = async (uid: string, disabled: boolean): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTION_NAME, uid)
    await updateDoc(userRef, { disabled })
  } catch (error) {
    console.error('사용자 상태 업데이트 실패:', error)
    throw error
  }
}
