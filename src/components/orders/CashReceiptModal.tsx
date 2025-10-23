'use client'

import { useState } from 'react'
import styles from './CashReceiptModal.module.css'

interface CashReceiptModalProps {
  orderId: string
  paymentId: string
  onClose: () => void
  onSuccess: () => void
}

export default function CashReceiptModal({
  orderId,
  paymentId,
  onClose,
  onSuccess,
}: CashReceiptModalProps) {
  const [userType, setUserType] = useState<'PERSONAL' | 'CORPORATE' | null>(null)
  const [identityNumber, setIdentityNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userType) {
      alert('개인 또는 사업자를 선택해주세요.')
      return
    }

    if (!identityNumber.trim()) {
      alert('인증번호를 입력해주세요.')
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch('/api/cash-receipt/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId,
          type: userType,
          identityNumber: identityNumber.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '현금영수증 발급에 실패했습니다.')
      }

      alert('현금영수증이 발급되었습니다.')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('현금영수증 발급 실패:', error)
      alert(error instanceof Error ? error.message : '현금영수증 발급에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>현금영수증 발급</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>발급 대상 선택</label>
            <div className={styles.buttonGroupHorizontal}>
              <button
                type="button"
                className={userType === 'PERSONAL' ? styles.typeButtonActive : styles.typeButton}
                onClick={() => setUserType('PERSONAL')}
              >
                개인 (소득공제용)
              </button>
              <button
                type="button"
                className={userType === 'CORPORATE' ? styles.typeButtonActive : styles.typeButton}
                onClick={() => setUserType('CORPORATE')}
              >
                사업자 (지출증빙용)
              </button>
            </div>
          </div>

          {userType && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {userType === 'PERSONAL' ? '휴대폰번호' : '사업자등록번호'}
              </label>
              <input
                type="text"
                className={styles.input}
                value={identityNumber}
                onChange={(e) => setIdentityNumber(e.target.value)}
                placeholder={
                  userType === 'PERSONAL'
                    ? '01012345678 (숫자만 입력)'
                    : '1234567890 (숫자만 입력)'
                }
                required
              />
              {userType === 'PERSONAL' && (
                <p className={styles.helperText}>
                  * 주민등록번호로도 발급 가능합니다
                </p>
              )}
            </div>
          )}

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || !userType}
            >
              {isSubmitting ? '발급 중...' : '발급하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
