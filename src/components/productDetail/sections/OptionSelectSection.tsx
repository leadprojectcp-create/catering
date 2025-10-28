'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Product, CartItem } from '../types'
import styles from './OptionSelectSection.module.css'

interface OptionSelectSectionProps {
  product: Product
  quantity: number
  cartItems: CartItem[]
  onQuantityChange: (qty: number) => void
  onCartItemsChange: (items: CartItem[]) => void
}

export default function OptionSelectSection({
  product,
  quantity,
  cartItems,
  onQuantityChange,
  onCartItemsChange
}: OptionSelectSectionProps) {
  const [expandedOptions, setExpandedOptions] = useState<{ [key: string]: boolean }>({})
  const [selectedOptions, setSelectedOptions] = useState<Array<{ groupName: string; optionName: string }>>([])
  const [selectedAdditionalOptions, setSelectedAdditionalOptions] = useState<Array<{ groupName: string; optionName: string }>>([])

  // 옵션 토글
  const toggleOption = (groupName: string) => {
    setExpandedOptions(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  // 옵션 선택
  const handleOptionSelect = (groupName: string, optionName: string) => {
    setSelectedOptions(prev => {
      const filteredOptions = prev.filter(opt => opt.groupName !== groupName)
      const existingIndex = prev.findIndex(
        opt => opt.groupName === groupName && opt.optionName === optionName
      )

      if (existingIndex !== -1) {
        return filteredOptions
      } else {
        return [...filteredOptions, { groupName, optionName }]
      }
    })
  }

  // 추가상품 옵션 선택
  const handleAdditionalOptionSelect = (groupName: string, optionName: string) => {
    setSelectedAdditionalOptions(prev => {
      const existingIndex = prev.findIndex(
        opt => opt.groupName === groupName && opt.optionName === optionName
      )

      if (existingIndex !== -1) {
        return prev.filter(
          opt => !(opt.groupName === groupName && opt.optionName === optionName)
        )
      } else {
        return [...prev, { groupName, optionName }]
      }
    })
  }

  // 장바구니에 담기
  const addToCart = () => {
    const optionsObj: { [key: string]: string } = {}
    selectedOptions.forEach(opt => {
      if (optionsObj[opt.groupName]) {
        optionsObj[opt.groupName] += `, ${opt.optionName}`
      } else {
        optionsObj[opt.groupName] = opt.optionName
      }
    })

    const additionalOptionsObj: { [key: string]: string } = {}
    selectedAdditionalOptions.forEach(opt => {
      if (additionalOptionsObj[opt.groupName]) {
        additionalOptionsObj[opt.groupName] += `, ${opt.optionName}`
      } else {
        additionalOptionsObj[opt.groupName] = opt.optionName
      }
    })

    const newItem: CartItem = {
      options: optionsObj,
      additionalOptions: Object.keys(additionalOptionsObj).length > 0 ? additionalOptionsObj : undefined,
      quantity: quantity
    }

    onCartItemsChange([...cartItems, newItem])

    // 초기화
    setSelectedOptions([])
    setSelectedAdditionalOptions([])
    onQuantityChange(1)
  }

  // 초기화
  const handleReset = () => {
    setSelectedOptions([])
    setSelectedAdditionalOptions([])
    onQuantityChange(1)
  }

  return (
    <div className={styles.optionSection}>
      {/* 옵션이 설정된 경우에만 표시 */}
      {product.optionsEnabled && (
        <>
          <h2 className={styles.optionSectionTitle}>
            상품 옵션 <span className={styles.requiredBadge}>*필수</span>
          </h2>

          {product.options?.map((option, index) => {
        const isExpanded = expandedOptions[option.groupName]

        return (
          <div key={index} className={isExpanded ? styles.optionGroupExpanded : styles.optionGroup}>
            <div
              className={styles.optionHeader}
              onClick={() => toggleOption(option.groupName)}
            >
              <div className={styles.optionHeaderLeft}>
                <span>{option.groupName}</span>
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
                      onClick={() => handleOptionSelect(option.groupName, value.name)}
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
        </>
      )}

      {/* 추가상품 옵션 - additionalOptionsEnabled가 true일 때만 표시 */}
      {product.additionalOptionsEnabled && product.additionalOptions && product.additionalOptions.length > 0 && (
        <>
          <h2 className={styles.optionSectionTitle} style={{ marginTop: '24px' }}>추가상품 (선택사항)</h2>
          {product.additionalOptions.map((option, index) => {
            const isExpanded = expandedOptions[option.groupName]

            return (
              <div key={`additional-${index}`} className={isExpanded ? styles.optionGroupExpanded : styles.optionGroup}>
                <div
                  className={styles.optionHeader}
                  onClick={() => toggleOption(option.groupName)}
                >
                  <div className={styles.optionHeaderLeft}>
                    <span>{option.groupName}</span>
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
                      const isSelected = selectedAdditionalOptions.some(
                        opt => opt.groupName === option.groupName && opt.optionName === value.name
                      )

                      return (
                        <div
                          key={valueIndex}
                          className={styles.optionItem}
                          onClick={() => handleAdditionalOptionSelect(option.groupName, value.name)}
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
        </>
      )}

      {/* 초기화 및 담기 버튼 */}
      <div className={styles.selectionButtonGroup}>
        <button className={styles.resetButton} onClick={handleReset}>
          <Image
            src="/icons/reset.svg"
            alt="초기화"
            width={24}
            height={24}
          />
          초기화
        </button>
        <button className={styles.addToCartButton} onClick={addToCart}>
          {cartItems.length > 0 ? '추가 담기' : '담기'}
        </button>
      </div>
    </div>
  )
}
