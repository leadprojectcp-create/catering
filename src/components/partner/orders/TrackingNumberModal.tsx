'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './TrackingNumberModal.module.css'

interface TrackingNumberModalProps {
  onClose: () => void
  onSubmit: (carrier: string, trackingNumber: string) => void
}

export default function TrackingNumberModal({ onClose, onSubmit }: TrackingNumberModalProps) {
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  const carriers = [
    '우체국 택배',
    'CJ 대한통운',
    '롯데 택배',
    '한진 택배',
    'CU 택배',
    '경동 택배',
    '일양로지스',
    'GS 포스트박스'
  ]

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleCarrierSelect = (selectedCarrier: string) => {
    setCarrier(selectedCarrier)
    setIsDropdownOpen(false)
  }

  const handleDropdownToggle = () => {
    if (!isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
    setIsDropdownOpen(!isDropdownOpen)
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
            <div className={styles.customDropdown} ref={dropdownRef}>
              <div
                ref={buttonRef}
                className={`${styles.dropdownButton} ${carrier ? styles.selected : ''}`}
                onClick={handleDropdownToggle}
              >
                <span className={styles.dropdownButtonText}>
                  {carrier || '택배사를 선택하세요'}
                </span>
                <svg
                  className={`${styles.dropdownArrow} ${isDropdownOpen ? styles.open : ''}`}
                  width="12"
                  height="8"
                  viewBox="0 0 12 8"
                  fill="none"
                >
                  <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              {isDropdownOpen && (
                <div
                  className={styles.dropdownList}
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`
                  }}
                >
                  {carriers.map((c) => (
                    <div
                      key={c}
                      className={`${styles.dropdownItem} ${carrier === c ? styles.active : ''}`}
                      onClick={() => handleCarrierSelect(c)}
                    >
                      {c}
                      {carrier === c && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13 4L6 11L3 8" stroke="#025BD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
