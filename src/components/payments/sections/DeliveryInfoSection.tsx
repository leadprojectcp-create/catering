'use client'

import { useState, useEffect } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import DeliveryAddressModal from './DeliveryAddressModal'
import AddressSearchModal from '@/components/common/AddressSearchModal'
import { DeliveryAddress, OrderInfo } from '../types'
import { useDeliveryAddress } from '../hooks/useDeliveryAddress'
import styles from './DeliveryInfoSection.module.css'

interface DeliveryInfoSectionProps {
  userId: string | null
  orderInfo: OrderInfo
  recipient: string
  addressName: string
  savedAddresses: DeliveryAddress[]
  onOrderInfoChange: (info: OrderInfo) => void
  onRecipientChange: (recipient: string) => void
  onAddressNameChange: (name: string) => void
  onSavedAddressesChange: (addresses: DeliveryAddress[]) => void
}

export default function DeliveryInfoSection({
  userId,
  orderInfo,
  recipient,
  addressName,
  savedAddresses,
  onOrderInfoChange,
  onRecipientChange,
  onAddressNameChange,
  onSavedAddressesChange
}: DeliveryInfoSectionProps) {
  const [showAddressList, setShowAddressList] = useState(false)
  const [showAddressSearch, setShowAddressSearch] = useState(false)
  const [isDefaultAddress, setIsDefaultAddress] = useState(false)

  // 배송지 관리 hook
  const { saveAddress, deleteAddress: deleteAddressHook, checkDuplicateAddress } = useDeliveryAddress(userId)

  // 컴포넌트 로드 시 기본 배송지 자동 불러오기
  useEffect(() => {
    if (savedAddresses.length > 0 && !orderInfo.address) {
      const defaultAddress = savedAddresses.find(addr => addr.defaultDelivery)
      if (defaultAddress) {
        loadAddress(defaultAddress)
      }
    }
  }, [savedAddresses])

  // 주소 검색 완료 핸들러
  const handleAddressComplete = (data: {
    address: string
    roadAddress: string
    jibunAddress: string
    zonecode: string
  }) => {
    onOrderInfoChange({
      ...orderInfo,
      address: data.address,
      zipCode: data.zonecode
    })
  }

  // 저장된 배송지 불러오기
  const loadAddress = (address: DeliveryAddress) => {
    onOrderInfoChange({
      orderer: address.orderer,
      phone: address.phone,
      email: address.email,
      detailAddress: address.detailAddress || '',
      address: address.address,
      zipCode: address.zipCode || '',
      deliveryDate: '',
      deliveryTime: '',
      request: ''
    })
    onRecipientChange(address.orderer)
    onAddressNameChange(address.name)
    setIsDefaultAddress(address.defaultDelivery || false)
  }

  // 배송지 삭제
  const handleDeleteAddress = async (addressId: string) => {
    if (!userId) return

    if (!confirm('이 배송지를 삭제하시겠습니까?')) return

    try {
      await deleteAddressHook(addressId)
      const updatedAddresses = savedAddresses.filter(addr => addr.id !== addressId)
      onSavedAddressesChange(updatedAddresses)
      alert('배송지가 삭제되었습니다.')
    } catch (error) {
      console.error('배송지 삭제 실패:', error)
      alert('배송지 삭제에 실패했습니다.')
    }
  }

  // 배송지 저장
  const handleSaveClick = async () => {
    if (!userId) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!orderInfo.address.trim()) {
      alert('주소를 먼저 입력해주세요.')
      return
    }

    if (!addressName.trim()) {
      alert('배송지명을 입력해주세요.')
      return
    }

    try {
      // 동일한 주소와 상세주소를 가진 기존 배송지 찾기
      const existingAddress = savedAddresses.find(addr =>
        addr.address === orderInfo.address && addr.detailAddress === orderInfo.detailAddress
      )

      if (existingAddress) {
        // 기존 배송지가 있으면 수정
        const userDocRef = doc(db, 'users', userId)

        // 기본 배송지 설정 시 다른 배송지들의 defaultDelivery를 false로
        let updatedAddresses = savedAddresses.map(addr => {
          if (addr.id === existingAddress.id) {
            // 현재 배송지 업데이트
            return {
              ...addr,
              name: addressName,
              orderer: recipient || orderInfo.orderer,
              phone: orderInfo.phone,
              email: orderInfo.email,
              zipCode: orderInfo.zipCode,
              defaultDelivery: isDefaultAddress
            }
          } else if (isDefaultAddress) {
            // 기본 배송지로 설정하는 경우 다른 배송지들의 defaultDelivery를 false로
            return { ...addr, defaultDelivery: false }
          }
          return addr
        })

        await setDoc(userDocRef, {
          deliveryAddresses: updatedAddresses
        }, { merge: true })

        onSavedAddressesChange(updatedAddresses)
        setIsDefaultAddress(false)
        alert('배송지 정보가 수정되었습니다.')
      } else {
        // 새로운 배송지 추가
        const newAddress = await saveAddress({
          name: addressName,
          orderer: recipient || orderInfo.orderer,
          phone: orderInfo.phone,
          email: orderInfo.email,
          address: orderInfo.address,
          detailAddress: orderInfo.detailAddress,
          zipCode: orderInfo.zipCode,
          defaultDelivery: isDefaultAddress
        })

        // 기본 배송지로 설정한 경우, 기존 배송지들의 defaultDelivery를 false로 업데이트
        const updatedAddresses = isDefaultAddress
          ? savedAddresses.map(addr => ({ ...addr, defaultDelivery: false }))
          : savedAddresses

        onSavedAddressesChange([...updatedAddresses, newAddress])
        setIsDefaultAddress(false)
        alert('배송지 정보가 저장되었습니다.')
      }
    } catch (error) {
      console.error('배송지 정보 저장 실패:', error)
      alert('배송지 정보 저장에 실패했습니다.')
    }
  }

  return (
    <section className={styles.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className={styles.sectionTitle}>배송지 설정</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {savedAddresses.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddressList(!showAddressList)}
              className={styles.addressButton}
            >
              배송지 목록 ({savedAddresses.length})
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveClick}
            className={styles.addressButton}
          >
            배송지 저장
          </button>
        </div>
      </div>

      {/* 배송지 목록 모달 */}
      <DeliveryAddressModal
        show={showAddressList}
        addresses={savedAddresses}
        onClose={() => setShowAddressList(false)}
        onLoadAddress={(address) => {
          loadAddress(address)
          setShowAddressList(false)
        }}
        onDeleteAddress={handleDeleteAddress}
      />

      {/* 주소 검색 모달 */}
      <AddressSearchModal
        isOpen={showAddressSearch}
        onClose={() => setShowAddressSearch(false)}
        onComplete={handleAddressComplete}
      />

      <div className={styles.deliveryContainer}>
        <div className={styles.formGroup}>
          <div className={styles.formRow}>
            <label className={styles.label}>주소</label>
            <div className={styles.addressInputWrapper} onClick={() => setShowAddressSearch(true)}>
              <input
                type="text"
                className={styles.addressInput}
                placeholder="주소를 검색해주세요"
                value={orderInfo.address ? `${orderInfo.address}${orderInfo.zipCode ? ` (${orderInfo.zipCode})` : ''}` : ''}
                readOnly
              />
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 19L14.65 14.65" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>상세주소</label>
            <input
              type="text"
              className={styles.input}
              placeholder="상세주소를 입력해주세요"
              value={orderInfo.detailAddress}
              onChange={(e) => onOrderInfoChange({...orderInfo, detailAddress: e.target.value})}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>배송지명</label>
            <input
              type="text"
              className={styles.input}
              placeholder="배송지명을 입력해주세요 (예: 집, 회사)"
              value={addressName}
              onChange={(e) => onAddressNameChange(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>수령인</label>
            <input
              type="text"
              className={styles.input}
              placeholder="수령인 이름을 입력해주세요."
              value={recipient}
              onChange={(e) => onRecipientChange(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>연락처</label>
            <input
              type="text"
              className={styles.input}
              placeholder="연락처를 입력해주세요"
              value={orderInfo.phone}
              onChange={(e) => onOrderInfoChange({...orderInfo, phone: e.target.value})}
            />
          </div>
        </div>

        {/* 기본 배송지 설정 체크박스 - 배송지 정보가 입력된 경우에만 표시 */}
        {orderInfo.address && (
          <div className={styles.defaultAddressCheckbox}>
            <label className={styles.checkboxLabel} onClick={async () => {
              if (!isDefaultAddress && savedAddresses.length === 0) {
                // 저장된 배송지가 없을 때만 자동으로 배송지 저장
                await handleSaveClick()
              } else if (savedAddresses.length > 0) {
                // 이미 배송지가 있는 경우 DB 업데이트
                if (!userId) return

                try {
                  const newValue = !isDefaultAddress

                  // 현재 입력된 배송지 정보와 일치하는 배송지 찾기
                  const matchingAddress = savedAddresses.find(addr =>
                    addr.address === orderInfo.address &&
                    addr.detailAddress === orderInfo.detailAddress
                  )

                  if (matchingAddress && newValue) {
                    // 모든 배송지의 defaultDelivery를 false로, 선택된 것만 true로
                    const updatedAddresses = savedAddresses.map(addr => ({
                      ...addr,
                      defaultDelivery: addr.id === matchingAddress.id
                    }))

                    // DB 업데이트
                    const userDocRef = doc(db, 'users', userId)
                    await setDoc(userDocRef, {
                      deliveryAddresses: updatedAddresses
                    }, { merge: true })

                    // 로컬 상태 업데이트
                    onSavedAddressesChange(updatedAddresses)
                  } else if (matchingAddress && !newValue) {
                    // 체크 해제
                    const updatedAddresses = savedAddresses.map(addr => ({
                      ...addr,
                      defaultDelivery: addr.id === matchingAddress.id ? false : addr.defaultDelivery
                    }))

                    const userDocRef = doc(db, 'users', userId)
                    await setDoc(userDocRef, {
                      deliveryAddresses: updatedAddresses
                    }, { merge: true })

                    onSavedAddressesChange(updatedAddresses)
                  }

                  setIsDefaultAddress(newValue)
                } catch (error) {
                  console.error('기본 배송지 설정 실패:', error)
                }
              } else {
                setIsDefaultAddress(!isDefaultAddress)
              }
            }}>
              <img
                src={isDefaultAddress ? '/icons/check_active.png' : '/icons/check_empty.png'}
                alt="checkbox"
                className={styles.checkboxIcon}
              />
              <span>기본 배송지 설정</span>
            </label>
          </div>
        )}
      </div>
    </section>
  )
}
