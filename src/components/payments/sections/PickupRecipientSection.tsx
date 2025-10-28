'use client'

import { OrderInfo } from '../types'
import styles from './PickupRecipientSection.module.css'

interface PickupRecipientSectionProps {
  recipient: string
  phone: string
  onRecipientChange: (recipient: string) => void
  onPhoneChange: (phone: string) => void
}

export default function PickupRecipientSection({
  recipient,
  phone,
  onRecipientChange,
  onPhoneChange
}: PickupRecipientSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>수령인 정보</h2>
      <div className={styles.deliveryContainer}>
        <div className={styles.formGroup}>
          <div className={styles.formRow}>
            <label className={styles.label}>수령인</label>
            <input
              type="text"
              className={styles.inputFull}
              placeholder="수령인 이름을 입력해주세요"
              value={recipient}
              onChange={(e) => onRecipientChange(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>연락처</label>
            <input
              type="tel"
              className={styles.inputFull}
              placeholder="연락처를 입력해주세요"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
