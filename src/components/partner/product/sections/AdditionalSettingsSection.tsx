import React from 'react'
import styles from '../AddProductPage.module.css'

interface AdditionalSettingsSectionProps {
  additionalSettings: string[]
  onChange: (additionalSettings: string[]) => void
}

export default function AdditionalSettingsSection({ additionalSettings, onChange }: AdditionalSettingsSectionProps) {
  const handleCheckboxChange = (setting: string, checked: boolean) => {
    if (checked) {
      onChange([...additionalSettings, setting])
    } else {
      onChange(additionalSettings.filter(s => s !== setting))
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>12</span>
        <span className={styles.sectionTitle}>상품주문 추가설정</span>
        <span className={styles.optionalLabel}>(선택사항)</span>
      </div>
      <div className={styles.additionalSettingsGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={additionalSettings.includes('보냉팩 포장')}
            onChange={(e) => handleCheckboxChange('보냉팩 포장', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={additionalSettings.includes('보냉팩 포장') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          보냉팩 포장
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={additionalSettings.includes('스티커 제작')}
            onChange={(e) => handleCheckboxChange('스티커 제작', e.target.checked)}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={additionalSettings.includes('스티커 제작') ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          스티커 제작
        </label>
      </div>
    </div>
  )
}
