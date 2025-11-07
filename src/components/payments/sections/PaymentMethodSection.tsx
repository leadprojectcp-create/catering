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
        <div
          className={`${styles.paymentMethodBox} ${paymentType === 'card' ? styles.paymentMethodBoxSelected : ''}`}
          onClick={() => onPaymentTypeChange('card')}
        >
          신용·체크 카드
        </div>
        <div
          className={`${styles.paymentMethodBox} ${paymentType === 'vbank' ? styles.paymentMethodBoxSelected : ''}`}
          onClick={() => onPaymentTypeChange('vbank')}
        >
          가상계좌
        </div>
        <div
          className={`${styles.paymentMethodBox} ${paymentType === 'trans' ? styles.paymentMethodBoxSelected : ''}`}
          onClick={() => onPaymentTypeChange('trans')}
        >
          계좌이체
        </div>
        <div
          className={`${styles.paymentMethodBox} ${paymentType === 'easy' ? styles.paymentMethodBoxSelected : ''}`}
          onClick={() => onPaymentTypeChange('easy')}
        >
          간편결제
        </div>
      </div>
    </section>
  )
}
