'use client'

import Image from 'next/image'
import { Timestamp } from 'firebase/firestore'
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

const formatOrderDate = (date: Date | Timestamp) => {
  const d = date instanceof Timestamp ? date.toDate() : new Date(date as unknown as string)
  const datePart = d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const weekday = d.toLocaleDateString('ko-KR', { weekday: 'short' })
  const timePart = d.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
  return `주문날짜 ${datePart} (${weekday}) ${timePart}`
}

export default function RegularOrderSection({ order }: Props) {
  const regularItems = order.items.filter(item => !item.isAddItem)
  if (regularItems.length === 0) return null

  const groupedItems = groupItemsByProduct(regularItems)

  // 최초 결제 정보 가져오기 (paymentInfo 배열의 첫 번째)
  const mainPaymentInfo = order.paymentInfo && order.paymentInfo.length > 0 ? order.paymentInfo[0] : null
  const mainPaymentStatus = mainPaymentInfo?.status || order.paymentStatus

  // 주문 날짜 가져오기: orderDates 배열의 첫 번째 (regular) 주문 날짜 사용
  const getOrderDate = () => {
    if (order.orderDates && Array.isArray(order.orderDates) && order.orderDates.length > 0) {
      const regularOrderDate = order.orderDates.find(od => od.type === 'regular')
      if (regularOrderDate?.createdAt) {
        return regularOrderDate.createdAt
      }
    }
    return order.createdAt
  }

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
          paymentStatusText = '환불완료'
        }

        // 포트원 결제 금액과 포인트 사용 금액 계산
        const usedPoint = mainPaymentInfo?.usedPoint || 0

        // amount가 객체일 수 있으므로 처리
        const paymentAmount = mainPaymentInfo?.amount
        let portonePaymentAmount: number

        if (typeof paymentAmount === 'object' && paymentAmount !== null) {
          // amount 객체에서 실제 결제 금액(paid) 가져오기
          portonePaymentAmount = (paymentAmount as any).paid || 0
        } else if (typeof paymentAmount === 'number') {
          // amount가 숫자면 포인트 차감
          portonePaymentAmount = paymentAmount - usedPoint
        } else {
          // amount가 없으면 상품 총액에서 포인트 차감
          portonePaymentAmount = productGroupTotal - usedPoint
        }

        return (
          <section key={`regular-${groupIndex}`} className={styles.orderDetailSection}>
            <div className={styles.orderInfoGroup}>
              <h3 className={styles.orderTypeTitle}>주문상품</h3>
              <div className={styles.orderDateText}>
                {formatOrderDate(getOrderDate())}
              </div>
              <div className={styles.paymentStatusText}>
                {paymentStatusText} {portonePaymentAmount.toLocaleString()}원
                {usedPoint > 0 && ` (포인트 ${usedPoint.toLocaleString()}원 ${normalizedStatus === 'cancelled' ? '환불' : '사용'})`}
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
                            return (
                              <div key={key} className={styles.optionItem}>
                                <div className={styles.optionItemFirstRow}>
                                  <span className={styles.optionGroup}>[{key}]</span>
                                  <span>{value}</span>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className={styles.optionItem}>
                            <div className={styles.optionItemFirstRow}>
                              <span className={styles.optionGroup}>[기본]</span>
                              <span>기본</span>
                            </div>
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
                            return (
                              <div key={key} className={styles.optionItem}>
                                <div className={styles.optionItemFirstRow}>
                                  <span className={styles.optionGroup}>[{key}]</span>
                                  <span>{value}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.productDetailsRight}>
                    <div className={styles.optionItemSecondRow}>
                      <span>{item.quantity}개</span>
                      <span>{itemTotalPrice.toLocaleString()}원</span>
                    </div>
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
