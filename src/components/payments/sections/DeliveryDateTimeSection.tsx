'use client'

import Image from 'next/image'
import DateTimePicker from './DateTimePicker'
import styles from './DeliveryDateTimeSection.module.css'

interface DeliveryDateTimeSectionProps {
  deliveryDate: string
  deliveryTime: string
  minOrderDays: number
  deliveryMethod: string
  quantityRanges?: {
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]
  totalQuantity?: number
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  onShowDateInfoModal: () => void
}

export default function DeliveryDateTimeSection({
  deliveryDate,
  deliveryTime,
  minOrderDays,
  deliveryMethod,
  quantityRanges,
  totalQuantity,
  onDateChange,
  onTimeChange,
  onShowDateInfoModal
}: DeliveryDateTimeSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {deliveryMethod === '택배 배송' ? '배송날짜설정' : '배송날짜 및 시간설정'}
        <button
          className={styles.infoButton}
          onClick={onShowDateInfoModal}
          type="button"
        >
          <Image
            src="/icons/info.svg"
            alt="정보"
            width={16}
            height={16}
          />
        </button>
      </h2>
      <div className={styles.deliveryContainer}>
        <div className={styles.formGroup}>
          <DateTimePicker
            deliveryDate={deliveryDate}
            deliveryTime={deliveryTime}
            minOrderDays={minOrderDays}
            deliveryMethod={deliveryMethod}
            quantityRanges={quantityRanges}
            totalQuantity={totalQuantity}
            onDateChange={onDateChange}
            onTimeChange={onTimeChange}
          />
        </div>
      </div>
    </section>
  )
}
