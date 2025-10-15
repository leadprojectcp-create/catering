'use client'

import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './OrderCancelModal.module.css'

interface OrderCancelModalProps {
  orderId: string
  onClose: () => void
  onCancel: () => void
}

const cancelReasons = [
  '단순 변심',
  '배송 시간 변경',
  '상품 정보 오류',
  '가격이 너무 비쌈',
  '다른 업체 이용',
  '기타'
]

export default function OrderCancelModal({ orderId, onClose, onCancel }: OrderCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCancel = async () => {
    if (!selectedReason) {
      alert('취소 사유를 선택해주세요.')
      return
    }

    if (selectedReason === '기타' && !customReason.trim()) {
      alert('취소 사유를 입력해주세요.')
      return
    }

    try {
      setIsSubmitting(true)

      const finalReason = selectedReason === '기타' ? customReason : selectedReason

      // Firestore에서 주문 상태 업데이트
      await updateDoc(doc(db, 'orders', orderId), {
        orderStatus: 'cancelled',
        cancelReason: finalReason,
        cancelledAt: new Date()
      })

      alert('주문이 취소되었습니다.')
      onCancel()
      onClose()
    } catch (error) {
      console.error('주문 취소 실패:', error)
      alert('주문 취소에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>주문 취소</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.description}>취소 사유를 선택해주세요.</p>

          <div className={styles.reasonList}>
            {cancelReasons.map((reason) => (
              <label key={reason} className={styles.reasonItem}>
                <input
                  type="radio"
                  name="cancelReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className={styles.radioInput}
                />
                <span className={styles.reasonText}>{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === '기타' && (
            <textarea
              className={styles.customReasonInput}
              placeholder="취소 사유를 입력해주세요."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={4}
            />
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            닫기
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {isSubmitting ? '취소 중...' : '주문 취소'}
          </button>
        </div>
      </div>
    </div>
  )
}
