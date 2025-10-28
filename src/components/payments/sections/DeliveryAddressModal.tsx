'use client'

import { DeliveryAddress } from '../types'
import styles from './DeliveryAddressModal.module.css'

interface DeliveryAddressModalProps {
  show: boolean
  addresses: DeliveryAddress[]
  onClose: () => void
  onLoadAddress: (address: DeliveryAddress) => void
  onDeleteAddress: (addressId: string) => void
}

export default function DeliveryAddressModal({
  show,
  addresses,
  onClose,
  onLoadAddress,
  onDeleteAddress
}: DeliveryAddressModalProps) {
  if (!show) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>배송지 목록</h3>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>
        {addresses.map((address) => (
          <div key={address.id} className={styles.addressItem}>
            <div className={styles.addressInfo}>
              <div className={styles.topRow}>
                <div className={styles.addressName}>{address.name}</div>
                <div className={styles.buttonGroup}>
                  <button onClick={() => onDeleteAddress(address.id)} className={styles.deleteButton}>
                    삭제
                  </button>
                  <button onClick={() => onLoadAddress(address)} className={styles.loadButton}>
                    선택
                  </button>
                </div>
              </div>
              <div className={styles.addressDetail}>
                {address.orderer} · {address.phone}
              </div>
              <div className={styles.addressDetail}>
                {address.address} {address.detailAddress}
                {address.zipCode && ` (${address.zipCode})`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
