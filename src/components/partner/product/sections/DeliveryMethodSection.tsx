import React from 'react'
import styles from '../AddProductPage.module.css'

export interface DeliveryFeeSettings {
  type: '무료' | '조건부 무료' | '유료' | '수량별'
  baseFee?: number
  freeCondition?: number
  paymentMethods?: ('선결제' | '착불')[]
  perQuantity?: boolean
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

  const handlePaymentMethodToggle = (method: '선결제' | '착불') => {
    if (!onDeliveryFeeChange || !deliveryFeeSettings) return

    const currentMethods = deliveryFeeSettings.paymentMethods || []
    const newMethods = currentMethods.includes(method)
      ? currentMethods.filter(m => m !== method)
      : [...currentMethods, method]

    onDeliveryFeeChange({
      ...deliveryFeeSettings,
      paymentMethods: newMethods
    })
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
          <h4 className={styles.subSectionTitle}>배송비 설정</h4>

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
              <span className={styles.customRadio}>
                {deliveryFeeSettings?.type === '무료' ? '●' : '○'}
              </span>
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
              <span className={styles.customRadio}>
                {deliveryFeeSettings?.type === '조건부 무료' ? '●' : '○'}
              </span>
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
              <span className={styles.customRadio}>
                {deliveryFeeSettings?.type === '유료' ? '●' : '○'}
              </span>
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
              <span className={styles.customRadio}>
                {deliveryFeeSettings?.type === '수량별' ? '●' : '○'}
              </span>
              수량별
            </label>
          </div>

          {/* 조건부 무료 상세 설정 */}
          {deliveryFeeSettings?.type === '조건부 무료' && (
            <div className={styles.feeDetailSettings}>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>기본 배송비</label>
                <input
                  type="number"
                  placeholder="배송비 입력"
                  value={deliveryFeeSettings.baseFee || ''}
                  onChange={(e) => handleFeeSettingChange('baseFee', Number(e.target.value))}
                  className={styles.input}
                />
                <span>원</span>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>배송비 조건</label>
                <input
                  type="number"
                  placeholder="최소 금액 입력"
                  value={deliveryFeeSettings.freeCondition || ''}
                  onChange={(e) => handleFeeSettingChange('freeCondition', Number(e.target.value))}
                  className={styles.input}
                />
                <span>원 이상 무료</span>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>결제 방식</label>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={deliveryFeeSettings.paymentMethods?.includes('선결제') || false}
                      onChange={() => handlePaymentMethodToggle('선결제')}
                      className={styles.hiddenCheckbox}
                    />
                    <span className={styles.customCheckbox}>
                      <img
                        src={deliveryFeeSettings.paymentMethods?.includes('선결제') ? "/icons/check_active.png" : "/icons/check.png"}
                        alt="체크박스"
                      />
                    </span>
                    선결제
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={deliveryFeeSettings.paymentMethods?.includes('착불') || false}
                      onChange={() => handlePaymentMethodToggle('착불')}
                      className={styles.hiddenCheckbox}
                    />
                    <span className={styles.customCheckbox}>
                      <img
                        src={deliveryFeeSettings.paymentMethods?.includes('착불') ? "/icons/check_active.png" : "/icons/check.png"}
                        alt="체크박스"
                      />
                    </span>
                    착불
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 유료 상세 설정 */}
          {deliveryFeeSettings?.type === '유료' && (
            <div className={styles.feeDetailSettings}>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>기본 배송비</label>
                <input
                  type="number"
                  placeholder="배송비 입력"
                  value={deliveryFeeSettings.baseFee || ''}
                  onChange={(e) => handleFeeSettingChange('baseFee', Number(e.target.value))}
                  className={styles.input}
                />
                <span>원</span>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>결제 방식</label>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={deliveryFeeSettings.paymentMethods?.includes('선결제') || false}
                      onChange={() => handlePaymentMethodToggle('선결제')}
                      className={styles.hiddenCheckbox}
                    />
                    <span className={styles.customCheckbox}>
                      <img
                        src={deliveryFeeSettings.paymentMethods?.includes('선결제') ? "/icons/check_active.png" : "/icons/check.png"}
                        alt="체크박스"
                      />
                    </span>
                    선결제
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={deliveryFeeSettings.paymentMethods?.includes('착불') || false}
                      onChange={() => handlePaymentMethodToggle('착불')}
                      className={styles.hiddenCheckbox}
                    />
                    <span className={styles.customCheckbox}>
                      <img
                        src={deliveryFeeSettings.paymentMethods?.includes('착불') ? "/icons/check_active.png" : "/icons/check.png"}
                        alt="체크박스"
                      />
                    </span>
                    착불
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 수량별 상세 설정 */}
          {deliveryFeeSettings?.type === '수량별' && (
            <div className={styles.feeDetailSettings}>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>기본 배송비</label>
                <input
                  type="number"
                  placeholder="배송비 입력"
                  value={deliveryFeeSettings.baseFee || ''}
                  onChange={(e) => handleFeeSettingChange('baseFee', Number(e.target.value))}
                  className={styles.input}
                />
                <span>원</span>
              </div>
              <div className={styles.checkboxRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={deliveryFeeSettings.perQuantity || false}
                    onChange={(e) => handleFeeSettingChange('perQuantity', e.target.checked)}
                    className={styles.hiddenCheckbox}
                  />
                  <span className={styles.customCheckbox}>
                    <img
                      src={deliveryFeeSettings.perQuantity ? "/icons/check_active.png" : "/icons/check.png"}
                      alt="체크박스"
                    />
                  </span>
                  개마다 기본배송비 반복 부과
                </label>
              </div>
              <div className={styles.inputRow}>
                <label className={styles.inputLabel}>결제 방식</label>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={deliveryFeeSettings.paymentMethods?.includes('선결제') || false}
                      onChange={() => handlePaymentMethodToggle('선결제')}
                      className={styles.hiddenCheckbox}
                    />
                    <span className={styles.customCheckbox}>
                      <img
                        src={deliveryFeeSettings.paymentMethods?.includes('선결제') ? "/icons/check_active.png" : "/icons/check.png"}
                        alt="체크박스"
                      />
                    </span>
                    선결제
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={deliveryFeeSettings.paymentMethods?.includes('착불') || false}
                      onChange={() => handlePaymentMethodToggle('착불')}
                      className={styles.hiddenCheckbox}
                    />
                    <span className={styles.customCheckbox}>
                      <img
                        src={deliveryFeeSettings.paymentMethods?.includes('착불') ? "/icons/check_active.png" : "/icons/check.png"}
                        alt="체크박스"
                      />
                    </span>
                    착불
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
