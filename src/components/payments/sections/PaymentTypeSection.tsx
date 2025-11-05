'use client'

import styles from './PaymentTypeSection.module.css'

interface PaymentTypeSectionProps {
  paymentType: 'general' | 'easy'
  onPaymentTypeChange: (type: 'general' | 'easy') => void
}

export default function PaymentTypeSection({
  paymentType,
  onPaymentTypeChange
}: PaymentTypeSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>결제 수단</h2>
      <div className={styles.paymentTypeWrapper}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="paymentType"
            value="general"
            checked={paymentType === 'general'}
            onChange={() => onPaymentTypeChange('general')}
            className={styles.radioInput}
          />
          <div className={styles.radioBox}>
            <span className={styles.radioCircle}>
              {paymentType === 'general' && <span className={styles.radioCircleInner} />}
            </span>
            <div className={styles.radioContent}>
              <div className={styles.paymentTitle}>일반결제</div>
              <div className={styles.paymentDescription}>
                (신용카드, 계좌이체, 가상계좌)
              </div>
            </div>
          </div>
        </label>

        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="paymentType"
            value="easy"
            checked={paymentType === 'easy'}
            onChange={() => onPaymentTypeChange('easy')}
            className={styles.radioInput}
          />
          <div className={styles.radioBox}>
            <span className={styles.radioCircle}>
              {paymentType === 'easy' && <span className={styles.radioCircleInner} />}
            </span>
            <div className={styles.radioContent}>
              <div className={styles.paymentTitle}>간편결제</div>
              <div className={styles.paymentDescription}>
                (카카오페이, 네이버페이, 토스페이, 애플페이, 삼성페이, 페이코, L-pay, SSG 페이)
              </div>
            </div>
          </div>
        </label>
      </div>
    </section>
  )
}
