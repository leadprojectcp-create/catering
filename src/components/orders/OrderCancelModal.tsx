'use client'

import { useState } from 'react'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import styles from './OrderCancelModal.module.css'
import checkEmpty from '@/../../public/icons/check_empty.png'
import checkActive from '@/../../public/icons/check_active.png'

interface OrderCancelModalProps {
  orderId: string
  deliveryDate: string // 배송 날짜
  totalAmount: number // 총 결제 금액
  paymentId: string | string[] | null // 결제 ID
  onClose: () => void
  onCancel: () => void
}

const cancelReasons = [
  '일정변경',
  '업체변경',
  '날짜변경',
  '단순변심',
  '기타'
]

// 환불 비율 계산 함수
const calculateRefundRate = (deliveryDate: string): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const delivery = new Date(deliveryDate)
  delivery.setHours(0, 0, 0, 0)

  const diffTime = delivery.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // 예약 3일전 이상: 100% 환불
  if (diffDays >= 3) {
    return 1.0
  }
  // 예약 2일전: 70% 환불
  else if (diffDays === 2) {
    return 0.7
  }
  // 예약 1일전: 50% 환불
  else if (diffDays === 1) {
    return 0.5
  }
  // 예약당일 또는 이후: 환불 불가
  else {
    return 0
  }
}

export default function OrderCancelModal({ orderId, deliveryDate, totalAmount, paymentId, onClose, onCancel }: OrderCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAgreed, setIsAgreed] = useState(false)

  // 환불 비율 및 금액 계산
  const refundRate = calculateRefundRate(deliveryDate)
  const refundAmount = Math.floor(totalAmount * refundRate)
  const canCancel = refundRate > 0

  const handleCancel = async () => {
    if (!canCancel) {
      alert('환불 불가능한 기간입니다.')
      return
    }

    if (!selectedReason) {
      alert('취소 사유를 선택해주세요.')
      return
    }

    if (selectedReason === '기타' && !customReason.trim()) {
      alert('취소 사유를 입력해주세요.')
      return
    }

    if (!isAgreed) {
      alert('취소 및 환불규정에 대한 내용을 확인해주세요.')
      return
    }

    if (!paymentId) {
      alert('결제 정보를 찾을 수 없습니다.')
      return
    }

    try {
      setIsSubmitting(true)

      const finalReason = selectedReason === '기타' ? customReason : selectedReason

      // paymentId가 배열인 경우 마지막 결제 ID 사용
      const targetPaymentId = Array.isArray(paymentId) ? paymentId[paymentId.length - 1] : paymentId

      // 포트원 결제 취소 API 호출
      const cancelResponse = await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: targetPaymentId,
          reason: finalReason,
          refundAmount: refundAmount,
        }),
      })

      const cancelData = await cancelResponse.json()

      if (!cancelData.success) {
        throw new Error(cancelData.error || '결제 취소에 실패했습니다.')
      }

      // 웹훅이 paymentInfo와 orderStatus를 자동으로 업데이트합니다

      alert(`주문이 취소되었습니다.\n환불 금액: ${refundAmount.toLocaleString()}원 (${Math.floor(refundRate * 100)}%)`)
      onCancel()
      onClose()
    } catch (error) {
      console.error('주문 취소 실패:', error)
      alert(error instanceof Error ? error.message : '주문 취소에 실패했습니다. 다시 시도해주세요.')
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
          <p className={styles.description}>취소 사유를 선택 또는 작성해주세요.</p>

          <div className={styles.radioGroup}>
            {cancelReasons.map((reason) => (
              <label key={reason} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="cancelReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className={styles.radioInput}
                />
                <span className={styles.radioCircle}>
                  {selectedReason === reason && <span className={styles.radioCircleInner} />}
                </span>
                <span className={styles.radioText}>{reason}</span>
              </label>
            ))}
          </div>

          {selectedReason === '기타' && (
            <textarea
              className={styles.customReasonInput}
              placeholder="취소 사유를 작성해주세요."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={4}
            />
          )}

          <div className={styles.policyBox}>
            <div className={styles.policyTitle}>꼭 알아두세요!</div>
            <div className={styles.policyDescription}>
              업체 주문접수 전, 주문취소시 100% 환불취소가 가능합니다.<br />
              주문접수이후 취소시 아래 환불 규정대로 환불 처리 됩니다.
            </div>
            <div className={styles.policyItem}>• 예약일 기준 3일전 : 100% 환불</div>
            <div className={styles.policyItem}>• 예약일 기준 2일전 : 70% 환불</div>
            <div className={styles.policyItem}>• 예약일 기준 1일전 : 50% 환불</div>
            <div className={styles.policyItem}>• 예약일 당일 취소 : 환불불가</div>
            <div className={styles.policyItem}>• 취소, 환불시 수수료가 발생할 수 있습니다.</div>
          </div>

          <div className={styles.refundInfoTitle}>환불금액안내</div>
          <div className={styles.refundInfo}>
            <div className={styles.refundRow}>
              <span className={styles.refundRowLabel}>총 결제금액</span>
              <span className={styles.refundRowValue}>{totalAmount.toLocaleString()}원</span>
            </div>
            <div className={styles.refundRow}>
              <span className={styles.refundRowLabel}>환불 비율</span>
              <span className={canCancel ? styles.refundRate : styles.noRefund}>
                {Math.floor(refundRate * 100)}%
              </span>
            </div>
            <div className={styles.refundDivider}></div>
            <div className={styles.refundRow}>
              <span className={styles.refundLabel}>총 환불 금액</span>
              <span className={styles.refundAmount}>{refundAmount.toLocaleString()}원</span>
            </div>
          </div>

          {!canCancel && (
            <div className={styles.warning}>
              ⚠️ 예약당일 또는 이후에는 환불이 불가능합니다.
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <label className={styles.checkboxContainer} onClick={() => setIsAgreed(!isAgreed)}>
            <Image
              src={isAgreed ? checkActive : checkEmpty}
              alt="checkbox"
              width={18}
              height={18}
              className={styles.checkboxImage}
            />
            <span className={styles.checkboxLabel}>취소 및 환불규정에 대한 내용을 모두확인 했습니다.</span>
          </label>
          <button
            className={styles.confirmButton}
            onClick={handleCancel}
            disabled={isSubmitting || !canCancel || !isAgreed}
          >
            {isSubmitting ? '취소 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}
