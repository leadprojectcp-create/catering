import React, { useState } from 'react'
import styles from './QuantitySection.module.css'

interface QuantityRange {
  minQuantity: number
  maxQuantity: number
  daysBeforeOrder: number
}

interface QuantitySectionProps {
  minOrderQuantity: number
  maxOrderQuantity: number
  quantityRanges?: QuantityRange[]
  onChange: (data: {
    minOrderQuantity?: number
    maxOrderQuantity?: number
    quantityRanges?: QuantityRange[]
  }) => void
}

export default function QuantitySection({
  minOrderQuantity,
  maxOrderQuantity,
  quantityRanges = [],
  onChange
}: QuantitySectionProps) {
  const handleAddRange = () => {
    // 마지막 range의 maxQuantity가 새로운 range의 minQuantity
    const newMinQuantity = quantityRanges.length > 0
      ? quantityRanges[quantityRanges.length - 1].maxQuantity
      : minOrderQuantity

    const newRange: QuantityRange = {
      minQuantity: newMinQuantity,
      maxQuantity: newMinQuantity + 10,
      daysBeforeOrder: 1
    }
    onChange({ quantityRanges: [...quantityRanges, newRange] })
  }

  const handleRemoveRange = (index: number) => {
    const updated = quantityRanges.filter((_, i) => i !== index)
    onChange({ quantityRanges: updated })
  }

  const handleRangeChange = (index: number, field: keyof QuantityRange, value: string) => {
    // 빈 문자열이면 빈 상태 유지, 아니면 숫자로 변환하되 앞의 0 제거
    let numValue: number
    if (value === '') {
      numValue = 0
    } else {
      // 앞의 0 제거하고 숫자로 변환
      const cleanedValue = value.replace(/^0+/, '') || '0'
      numValue = parseInt(cleanedValue, 10) || 0
    }

    const updated = quantityRanges.map((range, i) => {
      if (i === index) {
        return { ...range, [field]: numValue }
      }
      // maxQuantity가 변경되면 다음 range의 minQuantity도 업데이트
      if (field === 'maxQuantity' && i === index + 1) {
        return { ...range, minQuantity: numValue }
      }
      return range
    })
    onChange({ quantityRanges: updated })
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>6</span>
        <span className={styles.sectionTitle}>상품 수량별 주문 조건 설정</span>
      </div>

      <div className={styles.rangesContainer}>
        {quantityRanges.map((range, index) => {
          return (
            <div key={index} className={styles.rangeRow}>
              <div className={styles.mobileTopRow}>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    value={range.minQuantity}
                    readOnly
                    className={`${styles.textInput} ${styles.readOnlyInput}`}
                  />
                  <span className={styles.inputUnit}>개</span>
                </div>
                <span className={styles.tildeSeparator}>~</span>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    value={range.maxQuantity}
                    onChange={(e) => handleRangeChange(index, 'maxQuantity', e.target.value)}
                    min={range.minQuantity + 1}
                    className={styles.textInput}
                  />
                  <span className={styles.inputUnit}>개</span>
                </div>
              </div>
            <div className={styles.mobileBottomRow}>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  value={range.daysBeforeOrder}
                  onChange={(e) => handleRangeChange(index, 'daysBeforeOrder', e.target.value)}
                  min="1"
                  className={`${styles.textInput} ${styles.longUnitInput}`}
                />
                <span className={styles.inputUnit}>일 전 주문</span>
              </div>
              <button
                type="button"
                onClick={handleAddRange}
                className={styles.addButton}
              >
                +
              </button>
              {quantityRanges.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveRange(index)}
                  className={styles.removeButton}
                >
                  -
                </button>
              )}
            </div>
          </div>
          )
        })}

        {quantityRanges.length === 0 && (
          <div className={styles.emptyState}>
            <button
              type="button"
              onClick={handleAddRange}
              className={styles.addFirstButton}
            >
              + 수량 조건 추가
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
