'use client'

import Image from 'next/image'
import DateTimePicker from './DateTimePicker'
import styles from './PickupDateTimeSection.module.css'

interface PickupDateTimeSectionProps {
  deliveryDate: string
  deliveryTime: string
  minOrderDays: number
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  onShowDateInfoModal: () => void
}

export default function PickupDateTimeSection({
  deliveryDate,
  deliveryTime,
  minOrderDays,
  onDateChange,
  onTimeChange,
  onShowDateInfoModal
}: PickupDateTimeSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        픽업날짜 및 시간설정
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
            deliveryMethod="매장 픽업"
            onDateChange={onDateChange}
            onTimeChange={onTimeChange}
          />
        </div>
      </div>
    </section>
  )
}
