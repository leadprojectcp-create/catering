'use client'

import Image from 'next/image'
import { Product } from './OrderPage'
import styles from './OptionSelector.module.css'

interface OptionSelectorProps {
  product: Product
  expandedOptions: { [key: string]: boolean }
  selectedOptions: { [key: string]: string }
  onToggleOption: (groupName: string) => void
  onSelectOption: (groupName: string, optionName: string) => void
  onReset: () => void
  onAddToCart: () => void
}

export default function OptionSelector({
  product,
  expandedOptions,
  selectedOptions,
  onToggleOption,
  onSelectOption,
  onReset,
  onAddToCart
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
              <span>{option.groupName}</span>
              <Image
                src={isExpanded ? '/icons/chevron-up.svg' : '/icons/chevron-down.svg'}
                alt={isExpanded ? '접기' : '펼치기'}
                width={24}
                height={24}
              />
            </div>

            {isExpanded && (
              <div className={styles.optionList}>
                {option.values.map((value, valueIndex) => (
                  <div
                    key={valueIndex}
                    className={styles.optionItem}
                    onClick={() => onSelectOption(option.groupName, value.name)}
                  >
                    <Image
                      src={selectedOptions[option.groupName] === value.name ? '/icons/check_active.png' : '/icons/check_empty.png'}
                      alt="checkbox"
                      width={20}
                      height={20}
                    />
                    <span>{value.name}</span>
                    <span className={styles.optionPrice}>
                      + {value.price.toLocaleString()}원
                    </span>
                  </div>
                ))}
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
          담기
        </button>
      </div>
    </div>
  )
}
