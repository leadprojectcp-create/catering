'use client'

import { useState } from 'react'
import styles from './OrderCancelModal.module.css'

interface OrderCancelModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

const cancelReasons = [
  '고객요청',
  '재고소진',
  '날짜변경',
  '업체사정',
  '기타'
]

export default function OrderCancelModal({ isOpen, onClose, onConfirm }: OrderCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [customReason, setCustomReason] = useState<string>('')
  const [showRefundInfo, setShowRefundInfo] = useState(false)
  const [showPenaltyInfo, setShowPenaltyInfo] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (!selectedReason) {
      alert('취소 사유를 선택해주세요.')
      return
    }
    if (selectedReason === '기타' && !customReason.trim()) {
      alert('기타 사유를 입력해주세요.')
      return
    }
    const finalReason = selectedReason === '기타' ? customReason : selectedReason
    onConfirm(finalReason)
    setSelectedReason('')
    setCustomReason('')
  }

  const handleClose = () => {
    setSelectedReason('')
    setCustomReason('')
    onClose()
  }

  return (
    <>
      <div className={styles.overlay} onClick={handleClose}></div>
      <div className={styles.modal}>
        <h2 className={styles.title}>주문 취소</h2>
        <p className={styles.subtitle}>
          주문을 취소하시겠습니까? 취소 사유를 선택해주세요.
        </p>

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

        {selectedReason === '기타' && (
          <textarea
            className={styles.customReasonInput}
            placeholder="기타 사유를 입력해주세요."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            rows={3}
          />
        )}

        {/* 환급금 안내 */}
        <div className={styles.infoSection}>
          <button
            className={styles.infoHeader}
            onClick={() => setShowRefundInfo(!showRefundInfo)}
            type="button"
          >
            <span>환급금 안내</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={showRefundInfo ? styles.arrowUp : styles.arrowDown}
            >
              <path d="M4 6L8 10L12 6" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {showRefundInfo && (
            <div className={styles.infoContent}>
              <h4 className={styles.infoContentTitle}>고객요청에 의한 주문취소 환급금 안내</h4>
              <p className={styles.infoContentText}>
                고객 요청에 의한 주문 취소 시, 예약일 기준에 따라 환급금이 달라질 수 있습니다. 환급금은 정산 내역 페이지에서 확인하실 수 있으며, 정산일에 자동 환급됩니다.
              </p>
              <p className={styles.infoContentText}>
                환급 과정 중 문제가 발생하거나 추가 확인이 필요할 경우 [단모 고객센터]로 문의해 주시기 바랍니다.
              </p>
            </div>
          )}
        </div>

        {/* 주문 취소 패널티 규정안내 */}
        <div className={styles.infoSection}>
          <button
            className={styles.infoHeader}
            onClick={() => setShowPenaltyInfo(!showPenaltyInfo)}
            type="button"
          >
            <span>주문 취소 패널티 규정안내</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={showPenaltyInfo ? styles.arrowUp : styles.arrowDown}
            >
              <path d="M4 6L8 10L12 6" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {showPenaltyInfo && (
            <div className={styles.infoContent}>
              <h4 className={styles.infoContentTitle}>가게사정으로 인한 주문 취소 패널티 규정안내</h4>
              <p className={styles.infoContentText}>
                예약임박 또는 예약당일에 고객과의 합의가 이루어지지 않은 주문 취소 시, 단모 운영 정책에 따라 패널티가 부과 됩니다.
              </p>
              <div className={styles.penaltyBox}>
                <p className={styles.penaltyTitle}>[패널티 기준]</p>
                <p className={styles.penaltyItem}>1회 : 7일 활동 정지</p>
                <p className={styles.penaltyItem}>2회 : 30일 활동 정지</p>
                <p className={styles.penaltyItem}>3회 : 영업중지</p>
              </div>
            </div>
          )}
        </div>

        <button className={styles.confirmBtn} onClick={handleConfirm}>
          확인
        </button>
      </div>
    </>
  )
}
