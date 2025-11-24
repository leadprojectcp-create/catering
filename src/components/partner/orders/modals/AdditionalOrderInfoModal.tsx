'use client'

import styles from './AdditionalOrderInfoModal.module.css'

interface AdditionalOrderInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdditionalOrderInfoModal({ isOpen, onClose }: AdditionalOrderInfoModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>추가 주문 허용에 대한 안내</h2>
        <p className={styles.modalDescription}>
          고객이 결제까지 완료한 주문에 대해 상품을 추가하고 싶다고 요청한 경우, [추가 주문 허용]을 통해 고객이 다시 상품선택 및 결제를 할 수 있도록 주문 내역에 추가 주문 창을 열어줄 수 있습니다.
        </p>
        <button className={styles.closeButton} onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  )
}
