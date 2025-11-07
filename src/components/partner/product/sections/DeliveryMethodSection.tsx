import React from 'react'
import styles from './DeliveryMethodSection.module.css'

export interface DeliveryFeeSettings {
  type: '무료' | '조건부 무료' | '유료' | '수량별'
  baseFee?: number
  freeCondition?: number
  perQuantity?: number  // 몇 개마다 배송비를 반복 부과할지
}

interface DeliveryMethodSectionProps {
  deliveryMethods: string[]
  deliveryFeeSettings?: DeliveryFeeSettings
  onChange: (deliveryMethods: string[]) => void
  onDeliveryFeeChange?: (settings: DeliveryFeeSettings) => void
}

export default function DeliveryMethodSection({
  deliveryMethods,
  deliveryFeeSettings,
  onChange,
  onDeliveryFeeChange
}: DeliveryMethodSectionProps) {
  // 숫자 포맷팅 함수
  const formatNumber = (num: number | string): string => {
    if (!num) return ''
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const parseNumber = (str: string): number => {
    return Number(str.replace(/,/g, ''))
  }

  const handleCheckboxChange = (method: string, checked: boolean) => {
    if (checked) {
      onChange([...deliveryMethods, method])
    } else {
      onChange(deliveryMethods.filter(m => m !== method))
    }
  }

  const handleFeeTypeChange = (type: DeliveryFeeSettings['type']) => {
    if (onDeliveryFeeChange) {
      onDeliveryFeeChange({ type })
    }
  }

  const handleFeeSettingChange = (field: keyof DeliveryFeeSettings, value: number | boolean) => {
    if (onDeliveryFeeChange && deliveryFeeSettings) {
      onDeliveryFeeChange({
        ...deliveryFeeSettings,
        [field]: value
      })
    }
  }

  const handleNumberInput = (field: keyof DeliveryFeeSettings, value: string) => {
    const numValue = parseNumber(value)
    handleFeeSettingChange(field, numValue)
  }

  const isParcelDeliverySelected = deliveryMethods.includes('택배 배송')

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>11</span>
        <span className={styles.sectionTitle}>상품 배송 설정</span>
      </div>
      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={deliveryMethods.includes('퀵업체 배송')}
            onChange={(e) => handleCheckboxChange('퀵업체 배송', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={deliveryMethods.includes('퀵업체 배송') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          퀵업체 배송
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={deliveryMethods.includes('택배 배송')}
            onChange={(e) => handleCheckboxChange('택배 배송', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={deliveryMethods.includes('택배 배송') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          택배 배송
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={deliveryMethods.includes('매장 픽업')}
            onChange={(e) => handleCheckboxChange('매장 픽업', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={deliveryMethods.includes('매장 픽업') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          매장 픽업
        </label>
      </div>

      {/* 택배 배송 선택 시 배송비 설정 표시 */}
      {isParcelDeliverySelected && (
        <div className={styles.deliveryFeeSettings}>
          <h4 className={styles.subSectionTitle}>상품별 배송비 설정</h4>

          {/* 배송비 타입 선택 */}
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryFeeType"
                checked={deliveryFeeSettings?.type === '무료'}
                onChange={() => handleFeeTypeChange('무료')}
                className={styles.hiddenRadio}
              />
              <span className={`${styles.customRadio} ${deliveryFeeSettings?.type === '무료' ? styles.customRadioActive : ''}`}></span>
              무료
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryFeeType"
                checked={deliveryFeeSettings?.type === '조건부 무료'}
                onChange={() => handleFeeTypeChange('조건부 무료')}
                className={styles.hiddenRadio}
              />
              <span className={`${styles.customRadio} ${deliveryFeeSettings?.type === '조건부 무료' ? styles.customRadioActive : ''}`}></span>
              조건부 무료
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryFeeType"
                checked={deliveryFeeSettings?.type === '유료'}
                onChange={() => handleFeeTypeChange('유료')}
                className={styles.hiddenRadio}
              />
              <span className={`${styles.customRadio} ${deliveryFeeSettings?.type === '유료' ? styles.customRadioActive : ''}`}></span>
              유료
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryFeeType"
                checked={deliveryFeeSettings?.type === '수량별'}
                onChange={() => handleFeeTypeChange('수량별')}
                className={styles.hiddenRadio}
              />
              <span className={`${styles.customRadio} ${deliveryFeeSettings?.type === '수량별' ? styles.customRadioActive : ''}`}></span>
              수량별
            </label>
          </div>

          {/* 조건부 무료 상세 설정 */}
          {deliveryFeeSettings?.type === '조건부 무료' && (
            <div className={styles.feeDetailSettings}>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>기본 배송비</label>
                <input
                  type="text"
                  placeholder="배송비 입력"
                  value={formatNumber(deliveryFeeSettings.baseFee || '')}
                  onChange={(e) => handleNumberInput('baseFee', e.target.value)}
                  className={styles.input}
                />
                <span>원</span>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>배송비 조건</label>
                <input
                  type="text"
                  placeholder="최소 금액 입력"
                  value={formatNumber(deliveryFeeSettings.freeCondition || '')}
                  onChange={(e) => handleNumberInput('freeCondition', e.target.value)}
                  className={styles.input}
                />
                <span>원 이상 무료</span>
              </div>
            </div>
          )}

          {/* 유료 상세 설정 */}
          {deliveryFeeSettings?.type === '유료' && (
            <div className={styles.feeDetailSettings}>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>기본 배송비</label>
                <input
                  type="text"
                  placeholder="배송비 입력"
                  value={formatNumber(deliveryFeeSettings.baseFee || '')}
                  onChange={(e) => handleNumberInput('baseFee', e.target.value)}
                  className={styles.input}
                />
                <span>원</span>
              </div>
            </div>
          )}

          {/* 수량별 상세 설정 */}
          {deliveryFeeSettings?.type === '수량별' && (
            <div className={styles.feeDetailSettings}>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>기본 배송비</label>
                <input
                  type="text"
                  placeholder="배송비 입력"
                  value={formatNumber(deliveryFeeSettings.baseFee || '')}
                  onChange={(e) => handleNumberInput('baseFee', e.target.value)}
                  className={styles.input}
                />
                <span>원</span>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>반복 부과 수량</label>
                <input
                  type="text"
                  placeholder="예: 5"
                  value={formatNumber(deliveryFeeSettings.perQuantity || '')}
                  onChange={(e) => handleNumberInput('perQuantity', e.target.value)}
                  className={styles.input}
                />
                <span>개마다</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
