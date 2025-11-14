import React from 'react'
import Image from 'next/image'
import { ProductOption } from '../common/types/types'
import styles from './OptionSection.module.css'

interface OptionSectionProps {
  options: ProductOption[]
  onChange: (options: ProductOption[]) => void
  onShowHelpModal: () => void
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

export default function OptionSection({ options, onChange, onShowHelpModal, enabled, onToggle }: OptionSectionProps) {
  const formatNumberWithCommas = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const parseFormattedNumber = (str: string): number => {
    return Number(str.replace(/,/g, ''))
  }

  const addOptionGroup = () => {
    onChange([
      ...options,
      { groupName: '', values: [{ name: '', price: 0 }] }
    ])
  }

  const removeOptionGroup = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  const updateOptionGroup = (index: number, groupName: string) => {
    onChange(options.map((option, i) =>
      i === index ? { ...option, groupName: groupName.trim() } : option
    ))
  }

  const addOptionValue = (groupIndex: number) => {
    onChange(options.map((option, i) =>
      i === groupIndex
        ? { ...option, values: [...option.values, { name: '', price: 0 }] }
        : option
    ))
  }

  const updateOptionValue = (groupIndex: number, valueIndex: number, field: 'name' | 'price', value: string | number) => {
    onChange(options.map((option, i) =>
      i === groupIndex
        ? {
            ...option,
            values: option.values.map((val, j) =>
              j === valueIndex
                ? { ...val, [field]: field === 'price' ? Number(value) : (field === 'name' ? (value as string).trim() : value) }
                : val
            )
          }
        : option
    ))
  }

  const handleOptionNameBlur = (groupIndex: number, valueIndex: number, value: string) => {
    const trimmedValue = value.trim()
    if (trimmedValue) {
      // 현재 그룹 내 다른 옵션명들과 중복 확인
      const currentGroup = options[groupIndex]
      const isDuplicate = currentGroup.values.some((val, idx) =>
        idx !== valueIndex && val.name.trim() === trimmedValue
      )

      if (isDuplicate) {
        alert('이미 존재하는 옵션명입니다. 다른 이름을 입력해주세요.')
        // 중복된 경우 해당 필드 비우기
        updateOptionValue(groupIndex, valueIndex, 'name', '')
      }
    }
  }

  const removeOptionValue = (groupIndex: number, valueIndex: number) => {
    onChange(options.map((option, i) =>
      i === groupIndex
        ? { ...option, values: option.values.filter((_, j) => j !== valueIndex) }
        : option
    ))
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>7</span>
        <span className={styles.sectionTitle}>상품옵션 설정</span>
        <button
          type="button"
          className={styles.helpButton}
          onClick={onShowHelpModal}
        >
          <Image
            src="/icons/help.png"
            alt="도움말"
            width={20}
            height={20}
          />
        </button>
      </div>

      <div className={styles.toggleButtonGroup}>
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={enabled ? styles.toggleButtonActive : styles.toggleButton}
        >
          설정
        </button>
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={!enabled ? styles.toggleButtonActive : styles.toggleButton}
        >
          설정안함
        </button>
      </div>

      {enabled && options.map((option, groupIndex) => (
        <div key={groupIndex} className={styles.optionCard}>
          <div className={styles.optionGroupHeader}>
            <label className={styles.optionLabel}>옵션그룹명</label>
            {options.length > 1 && (
              <button
                type="button"
                onClick={() => removeOptionGroup(groupIndex)}
                className={styles.removeGroupButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M9.33464 6.66667V11.3333M6.66797 6.66667V11.3333M4.0013 4V11.8667C4.0013 12.6134 4.0013 12.9865 4.14663 13.2717C4.27446 13.5226 4.47828 13.727 4.72917 13.8548C5.0141 14 5.3873 14 6.13258 14H9.87003C10.6153 14 10.988 14 11.2729 13.8548C11.5238 13.727 11.7283 13.5226 11.8561 13.2717C12.0013 12.9868 12.0013 12.614 12.0013 11.8687V4M4.0013 4H5.33464M4.0013 4H2.66797M5.33464 4H10.668M5.33464 4C5.33464 3.37874 5.33464 3.06827 5.43613 2.82324C5.57145 2.49654 5.83085 2.23682 6.15755 2.10149C6.40258 2 6.71338 2 7.33464 2H8.66797C9.28922 2 9.59985 2 9.84488 2.10149C10.1716 2.23682 10.4311 2.49654 10.5664 2.82324C10.6679 3.06827 10.668 3.37875 10.668 4M10.668 4H12.0013M12.0013 4H13.3346" stroke="#999999" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                옵션 삭제
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="ex) 샌드위치"
            value={option.groupName}
            onChange={(e) => updateOptionGroup(groupIndex, e.target.value)}
            className={styles.textInput}
          />

          <div className={styles.optionValuesContainer}>
            <div className={styles.optionValuesHeader}>
              <label className={styles.optionLabel}>옵션명</label>
              <label className={styles.optionLabel}>옵션가격</label>
            </div>
            {option.values.map((value, valueIndex) => (
              <div key={valueIndex} className={styles.optionValueRow}>
                <div className={styles.optionInputGroup}>
                  <label className={styles.mobileOptionLabel}>옵션명</label>
                  <input
                    type="text"
                    placeholder="ex) 참치샌드위치"
                    value={value.name}
                    onChange={(e) => updateOptionValue(groupIndex, valueIndex, 'name', e.target.value)}
                    onBlur={(e) => handleOptionNameBlur(groupIndex, valueIndex, e.target.value)}
                    className={styles.textInput}
                  />
                </div>
                <div className={styles.optionInputGroup}>
                  <label className={styles.mobileOptionLabel}>옵션가격</label>
                  <div className={styles.priceInputWrapper}>
                    <input
                      type="text"
                      placeholder="ex) +1,000"
                      value={value.price !== undefined && value.price !== null ? `+${formatNumberWithCommas(value.price)}` : ''}
                      onChange={(e) => {
                        const cleanedValue = e.target.value.replace('+', '').replace(',', '')
                        const numValue = cleanedValue === '' ? 0 : parseFormattedNumber(cleanedValue)
                        updateOptionValue(groupIndex, valueIndex, 'price', numValue)
                      }}
                      className={styles.textInput}
                    />
                    {option.values.length === 1 ? (
                      <button
                        type="button"
                        onClick={() => addOptionValue(groupIndex)}
                        className={styles.addOptionValueButton}
                      >
                        +
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => addOptionValue(groupIndex)}
                          className={styles.addOptionValueButton}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeOptionValue(groupIndex, valueIndex)}
                          className={styles.removeOptionValueButton}
                        >
                          −
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {enabled && (
        <div className={styles.optionButtonContainer}>
          <button
            type="button"
            onClick={addOptionGroup}
            className={styles.addOptionGroupButton}
          >
            +옵션그룹추가
          </button>
        </div>
      )}
    </div>
  )
}
