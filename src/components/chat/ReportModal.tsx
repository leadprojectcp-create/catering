'use client'

import { useState } from 'react'
import styles from './ReportModal.module.css'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: string, details: string) => Promise<void>
  reportedUserName?: string
}

export default function ReportModal({ isOpen, onClose, onSubmit, reportedUserName }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reasons = [
    '욕설 또는 비속어 사용',
    '무례한 태도와 부적절한 제안',
    '무리한 서비스 요구',
    '개인 정보 요구',
    '기타'
  ]

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason)
  }

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert('신고 유형을 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(selectedReason, details)
      // 성공 후 초기화
      setSelectedReason('')
      setDetails('')
      onClose()
    } catch (error) {
      console.error('신고 제출 실패:', error)
      alert('신고 제출에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedReason('')
    setDetails('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>신고하기</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {/* Step 1: 신고 유형 선택 */}
          <div className={styles.stepTitle}>
            <span className={styles.stepNumber}>Step.1</span>
          </div>
          <h3 className={styles.stepQuestion}>신고 유형을 선택해주세요</h3>

          <div className={styles.reasonList}>
            {reasons.map((reason) => (
              <label key={reason} className={styles.reasonItem}>
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => handleReasonSelect(reason)}
                  className={styles.radioInput}
                />
                <span className={styles.radioLabel}>{reason}</span>
              </label>
            ))}
          </div>

          {/* Step 2: 신고 사유 작성 */}
          <div className={styles.stepTitle}>
            <span className={styles.stepNumber}>Step.2</span>
          </div>
          <h3 className={styles.stepQuestion}>신고사유를 작성해주세요</h3>

          <textarea
            className={styles.textarea}
            placeholder="신고사유를 구체적으로 작성해주세요"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
          />
          <div className={styles.charCount}>{details.length}/500</div>

          <div className={styles.footer}>
            <button
              className={styles.cancelButton}
              onClick={handleClose}
            >
              취소
            </button>
            <button
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedReason}
            >
              {isSubmitting ? '신고중...' : '신고하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
