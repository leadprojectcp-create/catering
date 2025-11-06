import styles from './PaymentMethodSection.module.css'

interface PaymentMethodSectionProps {
  paymentType: 'general' | 'easy'
  onPaymentTypeChange: (type: 'general' | 'easy') => void
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
            value="general"
            checked={paymentType === 'general'}
            onChange={() => onPaymentTypeChange('general')}
            className={styles.radioInput}
          />
          <span className={styles.radioText}>일반결제 (카드/계좌이체/가상계좌)</span>
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
