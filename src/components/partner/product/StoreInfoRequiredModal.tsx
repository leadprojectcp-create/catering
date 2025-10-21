'use client'

import { useRouter } from 'next/navigation'
import styles from './StoreInfoRequiredModal.module.css'

interface StoreInfoRequiredModalProps {
  missingInfo: string
  onClose?: () => void
}

export default function StoreInfoRequiredModal({ missingInfo, onClose }: StoreInfoRequiredModalProps) {
  const router = useRouter()

  const handleGoToStoreManagement = () => {
    if (onClose) onClose()
    router.push('/partner/store/management')
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.storeInfoModal}>
        <h2 className={styles.modalTitle}>가게 정보 등록 필요</h2>
        <p className={styles.modalMessage}>
          상품 등록을 하려면 먼저 가게 정보를 모두 등록해주세요.
        </p>
        <div className={styles.missingInfoBox}>
          <p className={styles.missingInfoLabel}>누락된 정보:</p>
          <p className={styles.missingInfoText}>{missingInfo}</p>
        </div>
        <div className={styles.modalButtons}>
          <button
            className={styles.modalButton}
            onClick={handleGoToStoreManagement}
          >
            가게 정보 등록하러 가기
          </button>
        </div>
      </div>
    </div>
  )
}
