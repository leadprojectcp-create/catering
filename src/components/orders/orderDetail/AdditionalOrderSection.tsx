'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Timestamp } from 'firebase/firestore'
import type { Order, OrderItem } from './types'
import styles from '../OrderDetailPage.module.css'
import OrderCancelModal from '../OrderCancelModal'

interface Props {
  order: Order
}

// Helper functions
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
  return `${datePart} (${weekday}) ${timePart} 주문`
}

const getPaymentDate = (order: Order, paymentId: string, groupIndex: number) => {
  // orderDates 배열에서 type이 'additional'인 항목들 찾기
  if (order.orderDates && Array.isArray(order.orderDates)) {
    const additionalOrderDates = order.orderDates.filter((od: any) => od.type === 'additional')

    // paymentId가 있으면 일치하는 것 찾기
    if (paymentId && paymentId !== 'point-only') {
      const matchingOrderDate = additionalOrderDates.find((od: any) =>
        od.paymentId === paymentId ||
        od.id === paymentId ||
        od.imp_uid === paymentId
      )
      if (matchingOrderDate?.createdAt) {
        const timestamp = matchingOrderDate.createdAt instanceof Timestamp
          ? matchingOrderDate.createdAt.toDate()
          : matchingOrderDate.createdAt instanceof Date
          ? matchingOrderDate.createdAt
          : new Date(matchingOrderDate.createdAt)
        return timestamp.getTime()
      }
    }

    // paymentId가 없거나 찾지 못했으면 groupIndex로 찾기
    if (additionalOrderDates[groupIndex]?.createdAt) {
      const timestamp = additionalOrderDates[groupIndex].createdAt instanceof Timestamp
        ? additionalOrderDates[groupIndex].createdAt.toDate()
        : additionalOrderDates[groupIndex].createdAt instanceof Date
        ? additionalOrderDates[groupIndex].createdAt
        : new Date(additionalOrderDates[groupIndex].createdAt)
      return timestamp.getTime()
    }
  }

  // 2순위: paymentInfo 배열에서 imp_uid가 paymentId와 일치하는 항목의 paid_at 값을 반환
  if (paymentId && paymentId !== 'point-only' && order.paymentInfo && Array.isArray(order.paymentInfo)) {
    const matchingPayment = order.paymentInfo.find((p: any) =>
      p.imp_uid === paymentId ||
      p.id === paymentId ||
      p.paymentId === paymentId
    )
    if (matchingPayment?.paid_at) {
      // Unix 타임스탬프를 밀리초로 변환 (paid_at은 초 단위)
      return matchingPayment.paid_at * 1000
    }
  }

  return null
}

export default function AdditionalOrderSection({ order }: Props) {
  const [cancelModalData, setCancelModalData] = useState<{
    paymentId: string
    amount: number
  } | null>(null)
  const addItems = order.items.filter(item => item.isAddItem)
  if (addItems.length === 0) return null

  const handleCancelSuccess = async () => {
    // OrderCancelModal에서 취소 처리가 완료되면 호출됨
    // API 호출은 OrderCancelModal 내부에서 처리됨
    window.location.reload()
  }

  // paymentId별로 그룹화
  const groupedByPaymentId: { [key: string]: OrderItem[] } = {}
  addItems.forEach(item => {
    const paymentId = item.paymentId || 'point-only'
    if (!groupedByPaymentId[paymentId]) {
      groupedByPaymentId[paymentId] = []
    }
    groupedByPaymentId[paymentId].push(item)
  })

  return (
    <>
      {Object.entries(groupedByPaymentId).map(([paymentId, paymentItems], groupIndex) => {
        // 같은 paymentId 내에서 상품명별로 다시 그룹화
        const groupedByProduct: { [key: string]: OrderItem[] } = {}
        paymentItems.forEach(item => {
          if (!groupedByProduct[item.productName]) {
            groupedByProduct[item.productName] = []
          }
          groupedByProduct[item.productName].push(item)
        })

        const paymentTotal = paymentItems.reduce((sum, item) => {
          return sum + (item.itemPrice || (item.price * item.quantity))
        }, 0)

        const firstItem = paymentItems[0]
        const paymentDate = getPaymentDate(order, paymentId, groupIndex)

        // 해당 paymentId의 결제 정보 찾기
        const paymentInfo = order.paymentInfo?.find(p =>
          p.id === paymentId ||
          p.paymentId === paymentId ||
          p.imp_uid === paymentId
        )
        const paymentStatus = paymentInfo?.status || order.paymentStatus

        // 포인트 사용 금액
        let usedPoint = paymentInfo?.usedPoint || 0

        // 포트원 결제 금액 계산
        // 1순위: paymentInfo.amount (새로운 주문의 경우)
        // 2순위: paymentInfo가 있고 amount가 명시되어 있으면 그 값 사용
        // 3순위: paymentInfo가 없거나 amount가 없으면 포인트 전용 결제로 판단
        let portonePaymentAmount: number

        if (paymentInfo?.amount !== undefined) {
          // 새로운 주문: paymentInfo에 amount가 명시되어 있음
          // amount가 객체일 수 있으므로 number로 변환
          portonePaymentAmount = typeof paymentInfo.amount === 'number'
            ? paymentInfo.amount
            : (paymentInfo.amount.total || 0)
          usedPoint = paymentInfo.usedPoint || 0
        } else if (paymentId === 'point-only' || paymentId === '' || !paymentId) {
          // 포인트 전용 결제
          portonePaymentAmount = 0
          usedPoint = paymentTotal
        } else {
          // 구버전 주문: paymentInfo는 있지만 amount가 없는 경우
          // 포트원 결제 금액 = 상품 총액 - 포인트 사용
          portonePaymentAmount = paymentTotal - usedPoint
        }

        // 결제 상태 텍스트 (대소문자 구분 없이 비교)
        let paymentStatusText = '결제 미완료'
        const normalizedStatus = paymentStatus?.toLowerCase()
        if (normalizedStatus === 'paid') {
          paymentStatusText = '결제완료'
        } else if (normalizedStatus === 'cancelled') {
          paymentStatusText = '결제취소'
        }

        return Object.entries(groupedByProduct).map(([productName, items], productIndex) => {
          const firstProductItem = items[0]

          return (
            <section key={`add-${paymentId}-${productIndex}`} className={styles.orderDetailSection}>
              {productIndex === 0 && (
                <div className={styles.orderInfoGroup}>
                  <h3 className={styles.orderTypeTitle}>추가주문상품</h3>
                  <div className={styles.orderDateText}>
                    {paymentDate ? formatOrderDate(new Date(paymentDate)) :
                     firstItem.createdAt ? formatOrderDate(new Date(firstItem.createdAt)) : '-'}
                  </div>
                  <div className={styles.paymentStatusText}>
                    {paymentStatusText} {portonePaymentAmount.toLocaleString()}원
                    {usedPoint > 0 && ` (포인트 ${usedPoint.toLocaleString()}원 사용)`}
                  </div>
                </div>
              )}

              <div className={styles.productBasicInfo}>
                <div className={styles.productItem}>
                  {firstProductItem.productImage && (
                    <Image
                      src={firstProductItem.productImage}
                      alt={productName}
                      width={70}
                      height={70}
                      quality={100}
                      className={styles.productImage}
                    />
                  )}

                  <div className={styles.productInfo}>
                    <div className={styles.productName}>{productName}</div>
                    {isDiscountValid(firstProductItem) && firstProductItem.discountedPrice ? (
                      <div className={styles.priceSection}>
                        <span className={styles.originalPrice}>{firstProductItem.price.toLocaleString()}원</span>
                        <span className={styles.discountedPrice}>{firstProductItem.discountedPrice.toLocaleString()}원</span>
                        <span className={styles.discountPercent}>{firstProductItem.discount!.discountPercent}%</span>
                      </div>
                    ) : (
                      <span className={styles.regularPrice}>{firstProductItem.price.toLocaleString()}원</span>
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

              {/* 추가주문 취소 버튼 - 각 productGroup의 마지막에만 표시 */}
              {/* shipping, completed 상태일 때는 취소 버튼 숨김 */}
              {(() => {
                const shouldShowButton = productIndex === Object.keys(groupedByProduct).length - 1 &&
                  order.orderStatus !== 'shipping' &&
                  order.orderStatus !== 'completed'

                console.log('[추가주문 취소버튼]', {
                  orderStatus: order.orderStatus,
                  isLastProduct: productIndex === Object.keys(groupedByProduct).length - 1,
                  shouldShowButton
                })

                return shouldShowButton && (
                  <button
                    onClick={() => setCancelModalData({ paymentId, amount: paymentTotal })}
                    className={styles.cancelAdditionalOrderButton}
                  >
                    추가주문취소
                  </button>
                )
              })()}
            </section>
          )
        })
      })}

      {/* 취소 모달 */}
      {cancelModalData && (
        <OrderCancelModal
          orderId={order.id}
          deliveryDate={order.deliveryInfo?.deliveryDate || order.deliveryDate || ''}
          totalAmount={cancelModalData.amount}
          paymentId={cancelModalData.paymentId}
          onClose={() => setCancelModalData(null)}
          onCancel={handleCancelSuccess}
        />
      )}
    </>
  )
}
