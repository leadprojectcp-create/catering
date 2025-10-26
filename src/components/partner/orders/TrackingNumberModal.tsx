'use client'

import { useState } from 'react'
import styles from './TrackingNumberModal.module.css'

interface TrackingNumberModalProps {
  onClose: () => void
  onSubmit: (carrier: string, trackingNumber: string) => void
}

export default function TrackingNumberModal({ onClose, onSubmit }: TrackingNumberModalProps) {
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  const carriers = [
    'CJ대한통운',
    '우체국택배',
    '한진택배',
    '롯데택배',
    'GS25편의점택배',
    'CU편의점택배',
    '로젠택배',
    '대신택배',
    '경동택배',
    '일양로지스',
    '합동택배',
    'GTX로지스',
    '천일택배',
    '건영택배',
    '기타'
  ]

  const handleSubmit = () => {
    if (!carrier) {
      alert('택배사를 선택해주세요.')
      return
    }
    if (!trackingNumber.trim()) {
      alert('송장번호를 입력해주세요.')
      return
    }
    onSubmit(carrier, trackingNumber.trim())
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>택배 정보 입력</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>택배사 선택</label>
            <select
              className={styles.select}
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            >
              <option value="">택배사를 선택하세요</option>
              {carriers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>송장번호</label>
            <input
              type="text"
              className={styles.input}
              placeholder="송장번호를 입력하세요"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            취소
          </button>
          <button className={styles.submitButton} onClick={handleSubmit}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
