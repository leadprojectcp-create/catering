'use client'

import Image from 'next/image'
import type { Order, OrderItem } from './types'
import styles from '../OrderDetailPage.module.css'

interface Props {
  order: Order
}

// Helper functions
const groupItemsByProduct = (items: OrderItem[]) => {
  const grouped: { [key: string]: OrderItem[] } = {}
  items.forEach(item => {
    if (!grouped[item.productName]) {
      grouped[item.productName] = []
    }
    grouped[item.productName].push(item)
  })
  return grouped
}

const isDiscountValid = (item: OrderItem) => {
  if (!item.discount || !item.discount.discountPercent || item.discount.discountPercent <= 0) {
    return false
  }

  // 상시 적용이거나 기간이 설정되지 않은 경우
  if (!item.discount.startDate || !item.discount.endDate) {
    return true
  }

  const now = new Date()
  const startDate = new Date(item.discount.startDate)
  const endDate = new Date(item.discount.endDate)

  // 현재 시간이 시작일과 종료일 사이에 있는지 체크
  return now >= startDate && now <= endDate
}

const formatOrderDate = (date: Date) => {
  const datePart = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' })
  const timePart = date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
  return `${datePart} (${weekday}) ${timePart} 주문`
}

export default function RegularOrderSection({ order }: Props) {
  const regularItems = order.items.filter(item => !item.isAddItem)
  if (regularItems.length === 0) return null

  const groupedItems = groupItemsByProduct(regularItems)

  // 최초 결제 정보 가져오기 (paymentInfo 배열의 첫 번째)
  const mainPaymentInfo = order.paymentInfo && order.paymentInfo.length > 0 ? order.paymentInfo[0] : null
  const mainPaymentStatus = mainPaymentInfo?.status || order.paymentStatus

  return (
    <>
      {Object.entries(groupedItems).map(([productName, items], groupIndex) => {
        const firstItem = items[0]
        const productGroupTotal = items.reduce((sum, item) => {
          return sum + (item.itemPrice || (item.price * item.quantity))
        }, 0)

        // 결제 상태 텍스트 (대소문자 구분 없이 비교)
        let paymentStatusText = '결제 미완료'
        const normalizedStatus = mainPaymentStatus?.toLowerCase()
        if (normalizedStatus === 'paid') {
          paymentStatusText = '결제완료'
        } else if (normalizedStatus === 'cancelled') {
          paymentStatusText = '결제취소'
        }

        return (
          <section key={`regular-${groupIndex}`} className={styles.orderDetailSection}>
            <div className={styles.orderInfoGroup}>
              <h3 className={styles.orderTypeTitle}>주문상품</h3>
              <div className={styles.orderDateText}>
                {formatOrderDate(order.createdAt)}
              </div>
              <div className={styles.paymentStatusText}>
                {paymentStatusText} {productGroupTotal.toLocaleString()}원
              </div>
            </div>

            <div className={styles.productBasicInfo}>
              <div className={styles.productItem}>
                {firstItem.productImage && (
                  <Image
                    src={firstItem.productImage}
                    alt={productName}
                    width={70}
                    height={70}
                    quality={100}
                    className={styles.productImage}
                  />
                )}

                <div className={styles.productInfo}>
                  <div className={styles.productName}>{productName}</div>
                  {isDiscountValid(firstItem) && firstItem.discountedPrice ? (
                    <div className={styles.priceSection}>
                      <span className={styles.originalPrice}>{firstItem.price.toLocaleString()}원</span>
                      <span className={styles.discountedPrice}>{firstItem.discountedPrice.toLocaleString()}원</span>
                      <span className={styles.discountPercent}>{firstItem.discount!.discountPercent}%</span>
                    </div>
                  ) : (
                    <span className={styles.regularPrice}>{firstItem.price.toLocaleString()}원</span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.productOptionsGroup}>
              {items.map((item, itemIndex) => {
              const itemTotalPrice = item.itemPrice || (item.price * item.quantity)
              return (
                <div key={itemIndex} className={styles.productDetailsBox}>
                  <div className={styles.productDetailsLeft}>
                    {/* 상품 옵션 */}
                    <div className={styles.optionSection}>
                      <div className={styles.optionSectionTitle}>상품 옵션</div>
                      <div className={styles.productOptions}>
                        {Object.keys(item.options).length > 0 ? (
                          Object.entries(item.options).map(([key, value]) => {
                            let optionPrice = 0
                            if (item.optionsWithPrices && item.optionsWithPrices[key]) {
                              optionPrice = item.optionsWithPrices[key].price
                            }
                            return (
                              <div key={key} className={styles.optionItem}>
                                <span className={styles.optionGroup}>[{key}]</span>
                                <span>{value} +{optionPrice.toLocaleString()}원</span>
                              </div>
                            )
                          })
                        ) : (
                          <div className={styles.optionItem}>
                            <span className={styles.optionGroup}>[기본]</span>
                            <span>기본 +0원</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 추가상품 */}
                    {item.additionalOptions && Object.keys(item.additionalOptions).length > 0 && (
                      <div className={styles.optionSection}>
                        <div className={styles.optionSectionTitle}>추가상품</div>
                        <div className={styles.productOptions}>
                          {Object.entries(item.additionalOptions).map(([key, value]) => {
                            let optionPrice = 0
                            if (item.additionalOptionsWithPrices && item.additionalOptionsWithPrices[key]) {
                              optionPrice = item.additionalOptionsWithPrices[key].price
                            }
                            return (
                              <div key={key} className={styles.optionItem}>
                                <span className={styles.optionGroup}>[{key}]</span>
                                <span>{value} +{optionPrice.toLocaleString()}원</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.productDetailsRight}>
                    <div className={styles.quantityInfo}>{item.quantity}개</div>
                    <div className={styles.priceInfo}>{itemTotalPrice.toLocaleString()}원</div>
                  </div>
                </div>
              )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
