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
    // 필수 옵션(상품옵션)이 활성화되어 있는 경우, 선택 여부 확인
    if (product.optionsEnabled && product.options && product.options.length > 0) {
      // 모든 필수 옵션 그룹에서 최소 하나씩 선택되었는지 확인
      const allRequiredOptionsSelected = product.options.every(optionGroup => {
        return selectedOptions.some(selected => selected.groupName === optionGroup.groupName)
      })

      if (!allRequiredOptionsSelected) {
        alert('필수 옵션(상품 옵션)을 모두 선택해주세요.')
        return
      }
    }

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

    // 필수 옵션이 없고 추가 옵션만 있는 경우
    if (!product.optionsEnabled && product.additionalOptionsEnabled) {
      // 첫 번째 담기: 기본 상품(첫 번째 항목)에 추가 옵션을 추가
      if (cartItems.length === 1 && Object.keys(cartItems[0].options).length === 0 && !cartItems[0].additionalOptions) {
        const updatedItem: CartItem = {
          options: {},
          additionalOptions: Object.keys(additionalOptionsObj).length > 0 ? additionalOptionsObj : undefined,
          quantity: cartItems[0].quantity
        }
        onCartItemsChange([updatedItem])
      } else {
        // 두 번째부터: 새로운 상품 추가 (추가 담기)
        const newItem: CartItem = {
          options: {},
          additionalOptions: Object.keys(additionalOptionsObj).length > 0 ? additionalOptionsObj : undefined,
          quantity: quantity
        }
        onCartItemsChange([...cartItems, newItem])
      }
    } else {
      // 필수 옵션이 있는 경우: 기존 로직
      const newItem: CartItem = {
        options: optionsObj,
        additionalOptions: Object.keys(additionalOptionsObj).length > 0 ? additionalOptionsObj : undefined,
        quantity: quantity
      }
      onCartItemsChange([...cartItems, newItem])
    }

    // 초기화
    setSelectedOptions([])
    setSelectedAdditionalOptions([])
    onQuantityChange(1)
  }

  // 초기화
  const handleReset = () => {
    setSelectedOptions([])
    setSelectedAdditionalOptions([])
    setExpandedOptions({})
    onQuantityChange(1)

    // 필수 옵션이 없고 추가 옵션만 있는 경우 기본 상품 1개로 초기화
    if (!product.optionsEnabled && product.additionalOptionsEnabled) {
      onCartItemsChange([{
        options: {},
        additionalOptions: undefined,
        quantity: 1
      }])
    }
    // 필수 옵션도 없고 추가 옵션도 없는 경우 기본 상품 1개로 초기화
    else if (!product.optionsEnabled && !product.additionalOptionsEnabled) {
      onCartItemsChange([{
        options: {},
        additionalOptions: undefined,
        quantity: 1
      }])
    }
    // 필수 옵션이 있는 경우 빈 배열로 초기화
    else {
      onCartItemsChange([])
    }
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
          {/* 필수 옵션이 없고 추가 옵션만 있는 경우 */}
          {!product.optionsEnabled && product.additionalOptionsEnabled ? (
            // 첫 번째 기본 상품에 추가 옵션이 없으면 "담기", 있으면 "추가 담기"
            (cartItems.length === 1 && !cartItems[0].additionalOptions) ? '담기' : '추가 담기'
          ) : (
            // 필수 옵션이 있는 경우: 기존 로직
            cartItems.length > 0 ? '추가 담기' : '담기'
          )}
        </button>
      </div>
    </div>
  )
}
