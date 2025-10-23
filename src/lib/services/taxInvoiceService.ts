import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface TaxInvoiceInfo {
  businessNumber: string
  companyName: string
  ceoName: string
  businessAddress: string
  businessType: string
  businessCategory: string
  email: string
}

/**
 * 사용자의 세금계산서 정보 조회
 */
export async function getTaxInvoiceInfo(userId: string): Promise<TaxInvoiceInfo | null> {
  try {
    const docRef = doc(db, 'taxInvoiceInfo', userId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data() as TaxInvoiceInfo
    }

    return null
  } catch (error) {
    console.error('세금계산서 정보 조회 실패:', error)
    return null
  }
}

/**
 * 사용자의 세금계산서 정보 저장
 */
export async function saveTaxInvoiceInfo(
  userId: string,
  info: TaxInvoiceInfo
): Promise<boolean> {
  try {
    const docRef = doc(db, 'taxInvoiceInfo', userId)
    await setDoc(docRef, {
      ...info,
      updatedAt: new Date(),
    })

    return true
  } catch (error) {
    console.error('세금계산서 정보 저장 실패:', error)
    return false
  }
}
