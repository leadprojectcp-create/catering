'use client'

import styles from './PaymentTypeSection.module.css'

interface PaymentTypeSectionProps {
  paymentMethod: 'card' | 'kakaopay' | 'naverpay'
  onPaymentMethodChange: (method: 'card' | 'kakaopay' | 'naverpay') => void
}

export default function PaymentTypeSection({
  paymentMethod,
  onPaymentMethodChange
}: PaymentTypeSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>결제 수단</h2>
      <div className={styles.paymentTypeWrapper}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="paymentMethod"
            value="card"
            checked={paymentMethod === 'card'}
            onChange={() => onPaymentMethodChange('card')}
            className={styles.radioInput}
          />
          <div className={styles.radioBox}>
            <span className={styles.radioCircle}>
              {paymentMethod === 'card' && <span className={styles.radioCircleInner} />}
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
            name="paymentMethod"
            value="kakaopay"
            checked={paymentMethod === 'kakaopay'}
            onChange={() => onPaymentMethodChange('kakaopay')}
            className={styles.radioInput}
          />
          <div className={styles.radioBox}>
            <span className={styles.radioCircle}>
              {paymentMethod === 'kakaopay' && <span className={styles.radioCircleInner} />}
            </span>
            <div className={styles.radioContent}>
              <div className={styles.paymentTitle}>카카오페이</div>
              <div className={styles.paymentDescription}>
                간편결제
              </div>
            </div>
          </div>
        </label>

        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="paymentMethod"
            value="naverpay"
            checked={paymentMethod === 'naverpay'}
            onChange={() => onPaymentMethodChange('naverpay')}
            className={styles.radioInput}
          />
          <div className={styles.radioBox}>
            <span className={styles.radioCircle}>
              {paymentMethod === 'naverpay' && <span className={styles.radioCircleInner} />}
            </span>
            <div className={styles.radioContent}>
              <div className={styles.paymentTitle}>네이버페이</div>
              <div className={styles.paymentDescription}>
                간편결제
              </div>
            </div>
          </div>
        </label>
      </div>
    </section>
  )
}
