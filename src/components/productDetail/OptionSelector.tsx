'use client'

import Image from 'next/image'
import { Product } from './ProductDetailPage'
import styles from './OptionSelector.module.css'

interface OptionSelectorProps {
  product: Product
  expandedOptions: { [key: string]: boolean }
  selectedOptions: Array<{ groupName: string; optionName: string }>
  onToggleOption: (groupName: string) => void
  onSelectOption: (groupName: string, optionName: string) => void
  onReset: () => void
  onAddToCart: () => void
  hasCartItems?: boolean
}

export default function OptionSelector({
  product,
  expandedOptions,
  selectedOptions,
  onToggleOption,
  onSelectOption,
  onReset,
  onAddToCart,
  hasCartItems = false
}: OptionSelectorProps) {
  return (
    <div className={styles.optionSection}>
      <h2 className={styles.optionSectionTitle}>상품 옵션</h2>

      {product.options?.map((option, index) => {
        const isExpanded = expandedOptions[option.groupName]

        return (
          <div key={index} className={isExpanded ? styles.optionGroupExpanded : styles.optionGroup}>
            <div
              className={styles.optionHeader}
              onClick={() => onToggleOption(option.groupName)}
            >
              <div className={styles.optionHeaderLeft}>
                <span>{option.groupName}</span>
                {option.isRequired && (
                  <span className={styles.requiredBadge}>*필수선택사항</span>
                )}
              </div>
              <Image
                src={isExpanded ? '/icons/chevron-up.svg' : '/icons/chevron-down.svg'}
                alt={isExpanded ? '접기' : '펼치기'}
                width={24}
                height={24}
              />
            </div>

            {isExpanded && (
              <div className={styles.optionList}>
                {option.values.map((value, valueIndex) => {
                  const isSelected = selectedOptions.some(
                    opt => opt.groupName === option.groupName && opt.optionName === value.name
                  )

                  return (
                    <div
                      key={valueIndex}
                      className={styles.optionItem}
                      onClick={() => onSelectOption(option.groupName, value.name)}
                    >
                      <Image
                        src={isSelected ? '/icons/check_active.png' : '/icons/check_empty.png'}
                        alt="checkbox"
                        width={20}
                        height={20}
                      />
                      <span>{value.name}</span>
                      <span className={styles.optionPrice}>
                        + {value.price.toLocaleString()}원
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* 초기화 및 담기 버튼 */}
      <div className={styles.selectionButtonGroup}>
        <button className={styles.resetButton} onClick={onReset}>
          <Image
            src="/icons/reset.svg"
            alt="초기화"
            width={24}
            height={24}
          />
          초기화
        </button>
        <button className={styles.addToCartButton} onClick={onAddToCart}>
          {hasCartItems ? '추가 담기' : '담기'}
        </button>
      </div>
    </div>
  )
}
