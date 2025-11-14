import React from 'react'
import styles from './DeliveryMethodSection.module.css'

export interface QuickDeliveryFeeSettings {
  type: '무료' | '조건부 지원' | '유료'
  freeCondition?: number  // 최소 구매 금액
  maxSupport?: number     // 최대 지원비 (0이면 퀵비 최대비용 지원)
}

export interface DeliveryFeeSettings {
  type: '무료' | '조건부 무료' | '유료' | '수량별'
  baseFee?: number
  freeCondition?: number
  perQuantity?: number  // 몇 개마다 배송비를 반복 부과할지
}

interface DeliveryMethodSectionProps {
  deliveryMethods: string[]
  quickDeliveryFeeSettings?: QuickDeliveryFeeSettings
  deliveryFeeSettings?: DeliveryFeeSettings
  onChange: (deliveryMethods: string[]) => void
  onQuickDeliveryFeeChange?: (settings: QuickDeliveryFeeSettings) => void
  onDeliveryFeeChange?: (settings: DeliveryFeeSettings) => void
}

export default function DeliveryMethodSection({
  deliveryMethods,
  quickDeliveryFeeSettings,
  deliveryFeeSettings,
  onChange,
  onQuickDeliveryFeeChange,
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

  const handleToggle = (method: string, enabled: boolean) => {
    if (enabled) {
      onChange([...deliveryMethods, method])
    } else {
      onChange(deliveryMethods.filter(m => m !== method))
    }
  }

  const handleQuickFeeTypeChange = (type: QuickDeliveryFeeSettings['type']) => {
    if (onQuickDeliveryFeeChange) {
      onQuickDeliveryFeeChange({ type })
    }
  }

  const handleQuickFeeSettingChange = (field: keyof QuickDeliveryFeeSettings, value: number) => {
    if (onQuickDeliveryFeeChange && quickDeliveryFeeSettings) {
      onQuickDeliveryFeeChange({
        ...quickDeliveryFeeSettings,
        [field]: value
      })
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

  const handleQuickNumberInput = (field: keyof QuickDeliveryFeeSettings, value: string) => {
    const numValue = parseNumber(value)
    handleQuickFeeSettingChange(field, numValue)
  }

  const handleNumberInput = (field: keyof DeliveryFeeSettings, value: string) => {
    const numValue = parseNumber(value)
    handleFeeSettingChange(field, numValue)
  }

  const isQuickDeliverySelected = deliveryMethods.includes('퀵업체 배송')
  const isParcelDeliverySelected = deliveryMethods.includes('택배 배송')

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>11</span>
        <span className={styles.sectionTitle}>상품 배송 설정</span>
      </div>

      {/* 퀵업체 배송 */}
      <div className={styles.deliveryMethodItem}>
        <div className={styles.deliveryMethodHeader}>
          <span className={styles.deliveryMethodLabel}>퀵업체 배송</span>
          <div className={styles.toggleButtonGroup}>
            <button
              type="button"
              onClick={() => handleToggle('퀵업체 배송', true)}
              className={deliveryMethods.includes('퀵업체 배송') ? styles.toggleButtonActive : styles.toggleButton}
            >
              설정
            </button>
            <button
              type="button"
              onClick={() => handleToggle('퀵업체 배송', false)}
              className={!deliveryMethods.includes('퀵업체 배송') ? styles.toggleButtonActive : styles.toggleButton}
            >
              설정안함
            </button>
          </div>
        </div>

        {/* 퀵업체 배송 선택 시 배송비 설정 표시 */}
        {isQuickDeliverySelected && (
          <div className={styles.deliveryFeeSettings}>
            <h4 className={styles.subSectionTitle}>퀵 배송비 설정</h4>

            {/* 배송비 타입 선택 */}
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="quickDeliveryFeeType"
                  checked={quickDeliveryFeeSettings?.type === '무료'}
                  onChange={() => handleQuickFeeTypeChange('무료')}
                  className={styles.hiddenRadio}
                />
                <span className={`${styles.customRadio} ${quickDeliveryFeeSettings?.type === '무료' ? styles.customRadioActive : ''}`}></span>
                무료
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="quickDeliveryFeeType"
                  checked={quickDeliveryFeeSettings?.type === '조건부 지원'}
                  onChange={() => handleQuickFeeTypeChange('조건부 지원')}
                  className={styles.hiddenRadio}
                />
                <span className={`${styles.customRadio} ${quickDeliveryFeeSettings?.type === '조건부 지원' ? styles.customRadioActive : ''}`}></span>
                조건부 지원
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="quickDeliveryFeeType"
                  checked={quickDeliveryFeeSettings?.type === '유료'}
                  onChange={() => handleQuickFeeTypeChange('유료')}
                  className={styles.hiddenRadio}
                />
                <span className={`${styles.customRadio} ${quickDeliveryFeeSettings?.type === '유료' ? styles.customRadioActive : ''}`}></span>
                유료
              </label>
            </div>

            {/* 조건부 지원 상세 설정 */}
            {quickDeliveryFeeSettings?.type === '조건부 지원' && (
              <div className={styles.feeDetailSettings}>
                <div className={styles.inputRow}>
                  <label className={styles.inputLabel}>배송비 조건</label>
                  <input
                    type="text"
                    placeholder="최소 구매 금액"
                    value={formatNumber(quickDeliveryFeeSettings.freeCondition || '')}
                    onChange={(e) => handleQuickNumberInput('freeCondition', e.target.value)}
                    className={styles.input}
                  />
                  <span>원 이상 시</span>
                </div>
                <div className={styles.inputRow}>
                  <label className={styles.inputLabel}>퀵 비용</label>
                  <div className={styles.inputWithHint}>
                    <div className={styles.inputWrapper}>
                      <input
                        type="text"
                        placeholder="최대 지원비"
                        value={formatNumber(quickDeliveryFeeSettings.maxSupport || '')}
                        onChange={(e) => handleQuickNumberInput('maxSupport', e.target.value)}
                        className={styles.input}
                      />
                      <span>원 지원</span>
                    </div>
                    <p className={styles.inputHint}>(0원 입력 시 퀵비 최대비용 지원)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 택배 배송 */}
      <div className={styles.deliveryMethodItem}>
        <div className={styles.deliveryMethodHeader}>
          <span className={styles.deliveryMethodLabel}>택배 배송</span>
          <div className={styles.toggleButtonGroup}>
            <button
              type="button"
              onClick={() => handleToggle('택배 배송', true)}
              className={deliveryMethods.includes('택배 배송') ? styles.toggleButtonActive : styles.toggleButton}
            >
              설정
            </button>
            <button
              type="button"
              onClick={() => handleToggle('택배 배송', false)}
              className={!deliveryMethods.includes('택배 배송') ? styles.toggleButtonActive : styles.toggleButton}
            >
              설정안함
            </button>
          </div>
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

      {/* 매장 픽업 */}
      <div className={styles.deliveryMethodItem}>
        <div className={styles.deliveryMethodHeader}>
          <span className={styles.deliveryMethodLabel}>매장 픽업</span>
          <div className={styles.toggleButtonGroup}>
            <button
              type="button"
              onClick={() => handleToggle('매장 픽업', true)}
              className={deliveryMethods.includes('매장 픽업') ? styles.toggleButtonActive : styles.toggleButton}
            >
              설정
            </button>
            <button
              type="button"
              onClick={() => handleToggle('매장 픽업', false)}
              className={!deliveryMethods.includes('매장 픽업') ? styles.toggleButtonActive : styles.toggleButton}
            >
              설정안함
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
