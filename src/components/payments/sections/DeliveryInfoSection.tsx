'use client'

import { useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import DeliveryAddressModal from './DeliveryAddressModal'
import { DeliveryAddress, OrderInfo, DaumPostcodeData } from '../types'
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

  // 주소 검색
  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data: DaumPostcodeData) {
          const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress
          onOrderInfoChange({
            ...orderInfo,
            address: addr,
            zipCode: data.zonecode
          })
        }
      }).open()
    } else {
      alert('주소 검색 서비스를 로딩 중입니다. 잠시 후 다시 시도해주세요.')
    }
  }

  // 배송지 저장
  const saveDeliveryInfo = async () => {
    if (!userId) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!addressName.trim()) {
      alert('배송지 이름을 입력해주세요.')
      return
    }

    if (!orderInfo.address.trim()) {
      alert('주소를 먼저 입력해주세요.')
      return
    }

    try {
      const newAddress: DeliveryAddress = {
        id: Date.now().toString(),
        name: addressName,
        orderer: recipient || orderInfo.orderer,
        phone: orderInfo.phone,
        email: orderInfo.email,
        address: orderInfo.address,
        detailAddress: orderInfo.detailAddress,
        zipCode: orderInfo.zipCode
      }

      const updatedAddresses = [...savedAddresses, newAddress]

      const userDocRef = doc(db, 'users', userId)
      await setDoc(userDocRef, {
        deliveryAddresses: updatedAddresses
      }, { merge: true })

      onSavedAddressesChange(updatedAddresses)
      alert('배송지 정보가 저장되었습니다.')
    } catch (error) {
      console.error('배송지 정보 저장 실패:', error)
      alert('배송지 정보 저장에 실패했습니다.')
    }
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
  }

  // 배송지 삭제
  const deleteAddress = async (addressId: string) => {
    if (!userId) return

    if (!confirm('이 배송지를 삭제하시겠습니까?')) return

    try {
      const updatedAddresses = savedAddresses.filter(addr => addr.id !== addressId)

      const userDocRef = doc(db, 'users', userId)
      await setDoc(userDocRef, {
        deliveryAddresses: updatedAddresses
      }, { merge: true })

      onSavedAddressesChange(updatedAddresses)
      alert('배송지가 삭제되었습니다.')
    } catch (error) {
      console.error('배송지 삭제 실패:', error)
      alert('배송지 삭제에 실패했습니다.')
    }
  }

  const handleSaveClick = async () => {
    if (!orderInfo.address.trim()) {
      alert('주소를 먼저 입력해주세요.')
      return
    }

    if (!addressName.trim()) {
      alert('배송지명을 입력해주세요.')
      return
    }

    await saveDeliveryInfo()
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
        onDeleteAddress={deleteAddress}
      />

      <div className={styles.deliveryContainer}>
        <div className={styles.formGroup}>
          <div className={styles.formRow}>
            <label className={styles.label}>주소</label>
            <div className={styles.addressInputWrapper} onClick={handleAddressSearch}>
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
      </div>
    </section>
  )
}
