import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface AIRecommendedCategory {
  id?: string
  name: string
  description: string
  imageUrl: string
  productIds: string[]
  createdBy: string
  createdAt: Timestamp
  prompt: string
  isActive: boolean
  displayOrder: number
}

/**
 * 이미지를 BunnyCDN에 업로드
 */
export async function uploadCategoryImage(
  file: File,
  categoryId: string
): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'aicategory')

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '이미지 업로드 실패')
    }

    const data = await response.json()
    return data.url
  } catch (error) {
    console.error('이미지 업로드 에러:', error)
    throw new Error('이미지 업로드에 실패했습니다.')
  }
}

/**
 * AI 추천 카테고리 생성
 */
export async function createAICategory(
  categoryData: Omit<AIRecommendedCategory, 'id' | 'createdAt' | 'imageUrl'>,
  imageFile: File
): Promise<string> {
  try {
    // 1. 먼저 문서 생성 (임시 이미지 URL)
    const docRef = await addDoc(collection(db, 'aiRecommendedCategories'), {
      ...categoryData,
      imageUrl: '', // 임시
      createdAt: Timestamp.now(),
    })

    // 2. 이미지 업로드
    const imageUrl = await uploadCategoryImage(imageFile, docRef.id)

    // 3. 이미지 URL 업데이트
    await updateDoc(doc(db, 'aiRecommendedCategories', docRef.id), {
      imageUrl,
    })

    return docRef.id
  } catch (error) {
    console.error('AI 카테고리 생성 에러:', error)
    throw error
  }
}

/**
 * AI 추천 카테고리 수정
 */
export async function updateAICategory(
  categoryId: string,
  updates: Partial<AIRecommendedCategory>,
  imageFile?: File
): Promise<void> {
  try {
    const docRef = doc(db, 'aiRecommendedCategories', categoryId)

    // 이미지 파일이 있으면 업로드
    if (imageFile) {
      const imageUrl = await uploadCategoryImage(imageFile, categoryId)
      updates.imageUrl = imageUrl
    }

    await updateDoc(docRef, updates as Partial<Record<string, unknown>>)
  } catch (error) {
    console.error('AI 카테고리 수정 에러:', error)
    throw error
  }
}

/**
 * AI 추천 카테고리 삭제
 */
export async function deleteAICategory(categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'aiRecommendedCategories', categoryId))
  } catch (error) {
    console.error('AI 카테고리 삭제 에러:', error)
    throw error
  }
}

/**
 * 모든 AI 추천 카테고리 가져오기
 */
export async function getAllAICategories(): Promise<AIRecommendedCategory[]> {
  try {
    const q = query(
      collection(db, 'aiRecommendedCategories'),
      orderBy('displayOrder', 'asc')
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AIRecommendedCategory[]
  } catch (error) {
    console.error('AI 카테고리 목록 조회 에러:', error)
    throw error
  }
}

/**
 * 활성화된 AI 추천 카테고리만 가져오기 (사용자 화면용)
 */
export async function getActiveAICategories(): Promise<
  AIRecommendedCategory[]
> {
  try {
    const q = query(
      collection(db, 'aiRecommendedCategories'),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AIRecommendedCategory[]
  } catch (error) {
    console.error('활성 AI 카테고리 조회 에러:', error)
    throw error
  }
}

/**
 * 특정 AI 추천 카테고리 가져오기
 */
export async function getAICategoryById(
  categoryId: string
): Promise<AIRecommendedCategory | null> {
  try {
    const docRef = doc(db, 'aiRecommendedCategories', categoryId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as AIRecommendedCategory
  } catch (error) {
    console.error('AI 카테고리 조회 에러:', error)
    throw error
  }
}

/**
 * AI 추천 카테고리 활성화/비활성화
 */
export async function toggleAICategoryActive(
  categoryId: string,
  isActive: boolean
): Promise<void> {
  try {
    const docRef = doc(db, 'aiRecommendedCategories', categoryId)
    await updateDoc(docRef, { isActive })
  } catch (error) {
    console.error('AI 카테고리 활성화 토글 에러:', error)
    throw error
  }
}
