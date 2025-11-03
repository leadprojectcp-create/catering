'use client'

import CustomDropdown from '../components/CustomDropdown'
import styles from './DeliveryRequestSection.module.css'

interface DeliveryRequestSectionProps {
  deliveryRequest: string
  entranceCode: string
  detailedRequest: string
  onDeliveryRequestChange: (request: string) => void
  onEntranceCodeChange: (code: string) => void
  onDetailedRequestChange: (request: string) => void
}

export default function DeliveryRequestSection({
  deliveryRequest,
  entranceCode,
  detailedRequest,
  onDeliveryRequestChange,
  onEntranceCodeChange,
  onDetailedRequestChange
}: DeliveryRequestSectionProps) {
  const requestOptions = [
    '도착 10분전에 전화주세요.',
    '문앞에 놓고 문자한번만 주세요.',
    '1층 로비에 맡겨주세요.',
    '지정 시간까지 꼭 도착해야 합니다.',
    '수령인 이름 꼭 확인하고 전달해주세요.'
  ]

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>배달 요청사항</h2>
      <div className={styles.requestContainer}>
        <div className={styles.formRow}>
          <label className={styles.label}>요청사항</label>
          <CustomDropdown
            value={deliveryRequest}
            placeholder="배송 요청사항을 선택해주세요"
            options={requestOptions}
            onChange={onDeliveryRequestChange}
          />
        </div>
        <div className={styles.formRow}>
          <label className={styles.label}>공동현관</label>
          <input
            type="text"
            className={styles.inputFull}
            placeholder="집, 회사 공동현관 출입번호를 입력해주세요."
            value={entranceCode}
            onChange={(e) => onEntranceCodeChange(e.target.value)}
          />
        </div>
        <div className={styles.formRowTop}>
          <label className={styles.label}>상세요청</label>
          <textarea
            className={styles.textareaFull}
            placeholder="배달기사님에게 필요한 상세 요청사항을 적어주세요."
            value={detailedRequest}
            onChange={(e) => onDetailedRequestChange(e.target.value)}
          />
        </div>
      </div>
    </section>
  )
}
