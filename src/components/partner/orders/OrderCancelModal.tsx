'use client'

import { useState } from 'react'
import styles from './OrderCancelModal.module.css'

interface OrderCancelModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

const cancelReasons = [
  '고객요청에 의한 주문취소',
  '재고소진으로 인한 주문취소',
  '날짜변경으로 인한 주문취소',
  '업체사정으로 인한 주문취소'
]

export default function OrderCancelModal({ isOpen, onClose, onConfirm }: OrderCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!selectedReason) {
      alert('취소 사유를 선택해주세요.')
      return
    }
    onConfirm(selectedReason)
    setSelectedReason('')
  }

  const handleClose = () => {
    setSelectedReason('')
    onClose()
  }

  return (
    <>
      <div className={styles.overlay} onClick={handleClose}></div>
      <div className={styles.modal}>
        <h2 className={styles.title}>
          주문을 취소하시겠습니까?
          <br />
          취소 사유를 선택해주세요.
        </h2>

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
              <span className={styles.radioLabel}>{reason}</span>
            </label>
          ))}
        </div>

        <div className={styles.buttonGroup}>
          <button className={styles.cancelBtn} onClick={handleClose}>
            취소
          </button>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            확인
          </button>
        </div>
      </div>
    </>
  )
}
