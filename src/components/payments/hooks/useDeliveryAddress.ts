import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { DeliveryAddress } from '../types'

/**
 * 배송지 관리 커스텀 훅
 */
export function useDeliveryAddress(userId: string | null) {
  /**
   * 배송지 저장
   */
  const saveAddress = async (address: Omit<DeliveryAddress, 'id'>): Promise<DeliveryAddress> => {
    if (!userId) {
      throw new Error('로그인이 필요합니다.')
    }

    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)
    const currentAddresses = userDoc.data()?.deliveryAddresses || []

    // 기본 배송지로 설정하는 경우, 기존 기본 배송지 해제
    let updatedAddresses = currentAddresses
    if (address.defaultDelivery) {
      updatedAddresses = currentAddresses.map((addr: DeliveryAddress) => ({
        ...addr,
        defaultDelivery: false
      }))
    }

    const newAddress: DeliveryAddress = {
      ...address,
      id: Date.now().toString()
    }

    await setDoc(userDocRef, {
      deliveryAddresses: [...updatedAddresses, newAddress]
    }, { merge: true })

    return newAddress
  }

  /**
   * 배송지 삭제
   */
  const deleteAddress = async (addressId: string): Promise<void> => {
    if (!userId) {
      throw new Error('로그인이 필요합니다.')
    }

    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)
    const addresses = userDoc.data()?.deliveryAddresses || []

    await setDoc(userDocRef, {
      deliveryAddresses: addresses.filter((addr: DeliveryAddress) => addr.id !== addressId)
    }, { merge: true })
  }

  /**
   * 중복 배송지 확인
   */
  const checkDuplicateAddress = async (address: string, detailAddress: string): Promise<boolean> => {
    if (!userId) return false

    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)
    const addresses = userDoc.data()?.deliveryAddresses || []

    return addresses.some((addr: DeliveryAddress) =>
      addr.address === address && addr.detailAddress === detailAddress
    )
  }

  /**
   * 배송지 목록 조회
   */
  const getAddresses = async (): Promise<DeliveryAddress[]> => {
    if (!userId) return []

    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)

    return userDoc.data()?.deliveryAddresses || []
  }

  /**
   * 배송지 업데이트
   */
  const updateAddress = async (addressId: string, updates: Partial<DeliveryAddress>): Promise<void> => {
    if (!userId) {
      throw new Error('로그인이 필요합니다.')
    }

    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)
    const addresses = userDoc.data()?.deliveryAddresses || []

    const updatedAddresses = addresses.map((addr: DeliveryAddress) =>
      addr.id === addressId ? { ...addr, ...updates } : addr
    )

    await setDoc(userDocRef, {
      deliveryAddresses: updatedAddresses
    }, { merge: true })
  }

  return {
    saveAddress,
    deleteAddress,
    checkDuplicateAddress,
    getAddresses,
    updateAddress
  }
}
