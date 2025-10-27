'use client'

import React from 'react'
import Image from 'next/image'
import { CartItem } from '@/lib/services/cartService'
import styles from './QuoteEstimate.module.css'

interface QuoteEstimateProps {
  item: CartItem
  onClose: () => void
}

export default function QuoteEstimate({ item, onClose }: QuoteEstimateProps) {
  const handlePrint = () => {
    window.print()
  }

  // 총 수량 계산
  const totalQuantity = item.totalQuantity || item.items.reduce((sum, opt) => sum + opt.quantity, 0)

  // 총 금액 계산 - itemPrice를 사용
  const calculateItemPrice = (cartItem: CartItem): number => {
    return cartItem.items.reduce((total, itemOption) => {
      // itemPrice가 있으면 그대로 사용
      if (itemOption.itemPrice !== undefined) {
        return total + itemOption.itemPrice
      }
      // 없으면 계산
      let itemTotal = 0
      if (itemOption.optionsWithPrices) {
        Object.values(itemOption.optionsWithPrices).forEach(opt => {
          itemTotal += opt.price
        })
      }
      if (itemOption.additionalOptionsWithPrices) {
        Object.values(itemOption.additionalOptionsWithPrices).forEach(opt => {
          itemTotal += opt.price
        })
      }
      return total + (itemTotal * itemOption.quantity)
    }, 0)
  }

  const totalPrice = item.totalProductPrice || calculateItemPrice(item)

  return (
    <div className={`${styles.overlay} quote-estimate-overlay`} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.actions}>
          <button onClick={handlePrint} className={styles.printButton}>
            인쇄하기
          </button>
          <button onClick={onClose} className={styles.closeButton}>
            닫기
          </button>
        </div>

        {/* A4 용지 */}
        <div className={styles.a4Page}>
          {/* 워터마크 */}
          <div className={styles.watermark}>
            <Image
              src="/assets/logo.png"
              alt="워터마크"
              width={600}
              height={600}
              className={styles.watermarkImage}
            />
          </div>

          <div className={styles.titleSection}>
            <Image
              src="/assets/logo.png"
              alt="로고"
              width={80}
              height={80}
              className={styles.titleLogo}
            />
            <h1 className={styles.title}>견적서</h1>
          </div>

          {/* 날짜와 공급자 정보 */}
          <div className={styles.header}>
            <div className={styles.leftSection}>
              <div className={styles.sectionLabel}>소비자</div>
              <div className={styles.dateInfo}>
                <div className={styles.headerLabel}>발행일</div>
                <div className={styles.headerValue}>{new Date().toLocaleDateString('ko-KR')}</div>
              </div>
              <div className={styles.recipientLine}>
                <span className={styles.fieldLine}></span>
                <span className={styles.recipientText}>귀하</span>
              </div>
            </div>
            <div className={styles.dividerLine}></div>
            <div className={styles.supplierInfo}>
              <div className={styles.sectionLabel}>공급자</div>
              <div className={styles.supplierDetails}>
                <div className={styles.supplierName}>(주)리프컴퍼니 [단모-단체의 모든것]</div>
                <div className={styles.ceoLine}>
                  <span className={styles.supplierText}>대표: 박상호</span>
                  <div className={styles.stampContainer}>
                    <span className={styles.stampText}>(인)</span>
                    <Image
                      src="/assets/stamp.png"
                      alt="직인"
                      width={50}
                      height={50}
                      className={styles.stampImage}
                    />
                  </div>
                </div>
                <div className={styles.supplierText}>사업자 등록번호 413-87-02826</div>
                <div className={styles.supplierText}>서울특별시 광진구 아차산로62길 14-12 202호</div>
                <div className={styles.supplierText}>대표번호 1666-5157</div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>상품 정보</h2>
            <div className={styles.infoRow}>
              <span className={styles.label}>가게명:</span>
              <span className={styles.value}>{item.storeName}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>상품명:</span>
              <span className={styles.value}>{item.productName}</span>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>옵션 상세</h2>
            <table className={styles.optionsTable}>
              <thead>
                <tr>
                  <th>구분</th>
                  <th>옵션</th>
                  <th>가격</th>
                  <th>수량</th>
                  <th>합계</th>
                </tr>
              </thead>
              <tbody>
                {item.items.map((itemOption, itemIndex) => {
                  // 기본 상품 가격 (price 필드)
                  const basePrice = itemOption.price || 0
                  // 상품 옵션 엔트리
                  const optionEntries = Object.entries(itemOption.options || {})
                  const hasOptions = optionEntries.length > 0

                  // 옵션이 없을 때는 [기본] 기본으로 표시
                  const displayOptionEntries = hasOptions
                    ? optionEntries
                    : [['기본', '기본'] as [string, string]]

                  // 추가상품 엔트리
                  const additionalEntries = Object.entries(itemOption.additionalOptions || {})
                  const hasAdditionalOptions = additionalEntries.length > 0

                  // 전체 행 개수 (기본상품 1 + 상품 옵션 + 추가상품)
                  const totalRows = 1 + displayOptionEntries.length + additionalEntries.length

                  // 이 아이템의 총 금액 계산
                  const itemTotalPrice = itemOption.itemPrice ?? 0

                  return (
                    <React.Fragment key={itemIndex}>
                      {/* 기본 상품 가격 */}
                      <tr key={`base-${itemIndex}`}>
                        <td>기본상품</td>
                        <td>{item.productName}</td>
                        <td>{basePrice.toLocaleString()}원</td>
                        <td rowSpan={totalRows}>{itemOption.quantity}개</td>
                        <td rowSpan={totalRows}>{itemTotalPrice.toLocaleString()}원</td>
                      </tr>

                      {/* 상품 옵션들 */}
                      {displayOptionEntries.map(([groupName, value], optionIndex) => {
                        const optionPrice = hasOptions && itemOption.optionsWithPrices?.[groupName]
                          ? itemOption.optionsWithPrices[groupName].price
                          : 0
                        return (
                          <tr key={`option-${itemIndex}-${groupName}`}>
                            {optionIndex === 0 && (
                              <td rowSpan={displayOptionEntries.length}>상품 옵션</td>
                            )}
                            <td>[{groupName}] {value}</td>
                            <td>+{optionPrice.toLocaleString()}원</td>
                          </tr>
                        )
                      })}

                      {/* 추가상품들 */}
                      {hasAdditionalOptions && additionalEntries.map(([groupName, value], addIndex) => {
                        const additionalPrice = itemOption.additionalOptionsWithPrices?.[groupName]
                          ? itemOption.additionalOptionsWithPrices[groupName].price
                          : 0
                        return (
                          <tr key={`additional-${itemIndex}-${groupName}`}>
                            {addIndex === 0 && (
                              <td rowSpan={additionalEntries.length}>추가상품</td>
                            )}
                            <td>[{groupName}] {value}</td>
                            <td>+{additionalPrice.toLocaleString()}원</td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>결제 정보</h2>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>총 상품수량:</span>
              <span className={styles.summaryValue}>{totalQuantity}개</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>총 결제금액:</span>
              <span className={styles.totalAmount}>{totalPrice.toLocaleString()}원</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
