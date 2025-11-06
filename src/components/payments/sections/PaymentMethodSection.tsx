import styles from './PaymentMethodSection.module.css'

export type PaymentType = 'card' | 'vbank' | 'trans' | 'easy'

interface PaymentMethodSectionProps {
  paymentType: PaymentType
  onPaymentTypeChange: (type: PaymentType) => void
}

export default function PaymentMethodSection({
  paymentType,
  onPaymentTypeChange
}: PaymentMethodSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>결제 수단</h2>
      <div className={styles.paymentMethodContainer}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="paymentType"
            value="card"
            checked={paymentType === 'card'}
            onChange={() => onPaymentTypeChange('card')}
            className={styles.radioInput}
          />
          <span className={styles.radioText}>신용카드</span>
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="paymentType"
            value="vbank"
            checked={paymentType === 'vbank'}
            onChange={() => onPaymentTypeChange('vbank')}
            className={styles.radioInput}
          />
          <span className={styles.radioText}>가상계좌</span>
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="paymentType"
            value="trans"
            checked={paymentType === 'trans'}
            onChange={() => onPaymentTypeChange('trans')}
            className={styles.radioInput}
          />
          <span className={styles.radioText}>계좌이체</span>
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
          <span className={styles.radioText}>간편결제 (카카오페이/네이버페이 등)</span>
        </label>
      </div>
    </section>
  )
}
