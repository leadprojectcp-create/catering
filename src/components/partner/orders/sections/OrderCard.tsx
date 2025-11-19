'use client'

import { useState } from 'react'
import type { Order, OrderStatus } from '@/lib/services/orderService'
import type { Timestamp, FieldValue } from 'firebase/firestore'
import Image from 'next/image'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './OrderCard.module.css'

interface OrderCardProps {
  order: Order
  isExpanded: boolean
  driverInfo?: { rName: string; rMobile: string }
  onToggleExpand: () => void
  onStatusUpdate: (orderId: string, status: OrderStatus) => Promise<void>
  onOpenCancelModal: (orderId: string) => void
  onOpenTrackingModal: (orderId: string) => void
  onOpenChat: (order: Order) => void
  onPrint: () => void
  onRefresh?: () => void
}

export default function OrderCard({
  order,
  isExpanded,
  driverInfo,
  onToggleExpand,
  onStatusUpdate,
  onOpenCancelModal,
  onOpenTrackingModal,
  onOpenChat,
  onPrint,
  onRefresh,
}: OrderCardProps) {
  const [allowAdditionalOrder, setAllowAdditionalOrder] = useState(order.allowAdditionalOrder ?? false)
  const [memo, setMemo] = useState(order.partnerMemo || '')
  const [isSavingMemo, setIsSavingMemo] = useState(false)
  const [isCancelingAdditional, setIsCancelingAdditional] = useState(false)

  const handleToggleAdditionalOrder = async () => {
    if (!order.id) return

    try {
      const newValue = !allowAdditionalOrder
      const orderRef = doc(db, 'orders', order.id)
      await updateDoc(orderRef, {
        allowAdditionalOrder: newValue
      })
      setAllowAdditionalOrder(newValue)
    } catch (error) {
      console.error('추가주문허용 업데이트 실패:', error)
      alert('업데이트에 실패했습니다.')
    }
  }

  const handleSaveMemo = async () => {
    if (!order.id) return

    setIsSavingMemo(true)
    try {
      const orderRef = doc(db, 'orders', order.id)
      await updateDoc(orderRef, {
        partnerMemo: memo
      })
      alert('메모가 저장되었습니다.')
    } catch (error) {
      console.error('메모 저장 실패:', error)
      alert('메모 저장에 실패했습니다.')
    } finally {
      setIsSavingMemo(false)
    }
  }

  const handleCancelAdditionalOrder = async (targetPaymentId: string) => {
    if (!order.id) return

    // 해당 paymentId의 상품만 필터링
    const targetItems = order.items.filter(item => item.paymentId === targetPaymentId)

    if (targetItems.length === 0) {
      alert('취소할 상품이 없습니다.')
      return
    }

    // 취소할 상품의 총 금액 계산
    const targetOrderAmount = targetItems.reduce((sum, item) => {
      return sum + (item.itemPrice || (item.price * item.quantity))
    }, 0)

    if (!window.confirm(`이 추가주문을 취소하시겠습니까?\n\n취소 상품: ${targetItems.length}개\n환불 금액: ${targetOrderAmount.toLocaleString()}원 (100%)`)) {
      return
    }

    setIsCancelingAdditional(true)
    try {
      // 해당 paymentId의 paymentInfo에서 금액 찾기
      const paymentInfo = order.paymentInfo?.find((info: any) => info.id === targetPaymentId)
      if (!paymentInfo) {
        throw new Error('결제 정보를 찾을 수 없습니다.')
      }

      const refundAmount = (paymentInfo as any).amount?.total || paymentInfo.amount

      const cancelResponse = await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: targetPaymentId,
          reason: '판매자 요청 - 추가주문 취소',
          refundAmount: refundAmount,
          isPartnerCancel: true,
          isPartialCancel: true, // 부분 취소: orderStatus 변경 안함
        }),
      })

      const cancelData = await cancelResponse.json()
      if (!cancelData.success) {
        throw new Error(cancelData.error || '결제 취소에 실패했습니다.')
      }

      // Firestore에서 해당 paymentId의 상품만 제거
      const remainingItems = order.items.filter(item => item.paymentId !== targetPaymentId)
      console.log('[추가주문 취소] 남은 items:', remainingItems)

      const orderRef = doc(db, 'orders', order.id)

      // totalProductPrice 재계산
      const newTotalProductPrice = remainingItems.reduce((sum, item) => {
        return sum + (item.itemPrice || (item.price * item.quantity))
      }, 0)

      console.log('[추가주문 취소] 새로운 totalProductPrice:', newTotalProductPrice)

      await updateDoc(orderRef, {
        items: remainingItems,
        totalProductPrice: newTotalProductPrice,
        updatedAt: new Date()
      })

      alert(`추가주문이 취소되었습니다.\n환불 금액: ${targetOrderAmount.toLocaleString()}원 (100%)`)

      // 페이지 새로고침
      if (onRefresh) {
        onRefresh()
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error('추가주문 취소 실패:', error)
      alert(error instanceof Error ? error.message : '추가주문 취소에 실패했습니다.')
    } finally {
      setIsCancelingAdditional(false)
    }
  }

  const formatDate = (date: Date | Timestamp | FieldValue | undefined) => {
    if (!date) return '-'

    // Firestore Timestamp를 Date로 변환
    let d: Date
    if (date instanceof Date) {
      d = date
    } else if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      d = (date as Timestamp).toDate()
    } else {
      d = new Date(date as unknown as string)
    }

    // Invalid Date 체크
    if (isNaN(d.getTime())) return '-'

    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[d.getDay()]
    const hours = d.getHours()
    const minutes = d.getMinutes()
    const seconds = d.getSeconds()
    const period = hours >= 12 ? '오후' : '오전'
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours

    return `${year}년 ${month}월 ${day}일 (${weekday}) ${period} ${displayHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원'
  }

  // 배송비 표시 텍스트 생성 함수 (deliveryFeeBreakdown 사용)
  const getDeliveryFeeText = () => {
    // deliveryFeeBreakdown이 있으면 우선 사용
    if (order.deliveryFeeBreakdown) {
      const { customerFee, storeFee, feeType } = order.deliveryFeeBreakdown

      if (storeFee > 0 && customerFee === 0) {
        return `${feeType} (판매자 부담 ${formatCurrency(storeFee)})`
      } else if (customerFee > 0 && storeFee === 0) {
        return `${feeType} (고객 부담 ${formatCurrency(customerFee)})`
      } else if (customerFee > 0 && storeFee > 0) {
        return `${feeType} (고객 ${formatCurrency(customerFee)}, 판매자 ${formatCurrency(storeFee)})`
      } else if (feeType === '무료') {
        return '무료 (판매자부담)'
      } else {
        return `${feeType}`
      }
    }

    // 레거시: deliveryFeeBreakdown이 없는 경우 기존 로직 사용
    if (order.deliveryMethod === '택배 배송' && order.deliveryFeeSettings) {
      const settings = order.deliveryFeeSettings
      const totalProductPrice = order.totalProductPrice || 0

      switch (settings.type) {
        case '무료':
          return `무료 (판매자 부담 ${formatCurrency(settings.baseFee || 0)})`
        case '유료':
          return `유료 배송 (고객 부담 ${formatCurrency(settings.baseFee || 0)})`
        case '조건부 무료':
          const conditionMet = totalProductPrice >= (settings.freeCondition || 0)
          return conditionMet
            ? '조건부 무료 적용 (판매자부담)'
            : `조건부 무료 미적용 (고객부담 ${formatCurrency(settings.baseFee || 0)})`
        case '수량별':
          const totalQuantity = order.totalQuantity || order.items.reduce((sum, item) => sum + item.quantity, 0)
          const quantityFee = Math.ceil(totalQuantity / (settings.perQuantity || 10)) * (settings.baseFee || 0)
          return `수량별 배송비 적용 (고객부담 ${formatCurrency(quantityFee)})`
        default:
          return '-'
      }
    } else if (order.deliveryMethod === '퀵업체 배송' && order.quickDeliveryFeeSettings) {
      const settings = order.quickDeliveryFeeSettings
      const totalProductPrice = order.totalProductPrice || 0
      const actualQuickFee = order.deliveryFee || 0

      switch (settings.type) {
        case '무료':
          return `퀵 배송 무료 (판매자 부담 ${formatCurrency(actualQuickFee)})`
        case '유료':
          return '퀵 유료 (고객 부담)'
        case '조건부 지원':
          const conditionMet = totalProductPrice >= (settings.freeCondition || 0)
          const supportAmount = Math.min(actualQuickFee, settings.maxSupport || 0)

          if (conditionMet) {
            return `퀵비 지원 적용 (판매자부담 ${formatCurrency(supportAmount)})`
          } else {
            return '퀵비 지원 미적용 (고객 부담)'
          }
        default:
          return '-'
      }
    }
    return '-'
  }

  const handlePhoneClick = (order: Order) => {
    if (!order.phone) {
      alert('전화번호가 없습니다.')
      return
    }
    window.location.href = `tel:${order.phone}`
  }

  // 배송 날짜와 시간 가져오기 (deliveryInfo 우선, 없으면 기본 필드)
  const actualDeliveryDate = order.deliveryInfo?.deliveryDate || order.deliveryDate
  const actualDeliveryTime = order.deliveryInfo?.deliveryTime || order.deliveryTime

  // D-day 계산
  let dDay = '-'
  let formattedReservation = '-'

  if (actualDeliveryDate) {
    const deliveryDateObj = new Date(actualDeliveryDate)
    const today = new Date()
    const diffTime = deliveryDateObj.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    dDay = diffDays >= 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`

    // 예약날짜 포맷
    const year = deliveryDateObj.getFullYear()
    const month = deliveryDateObj.getMonth() + 1
    const day = deliveryDateObj.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[deliveryDateObj.getDay()]

    formattedReservation = `${year}년 ${month}월 ${day}일 (${weekday})`

    if (actualDeliveryTime) {
      const [hour, minute] = actualDeliveryTime.split(':').map(Number)
      const period = hour >= 12 ? '오후' : '오전'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      formattedReservation += ` ${period} ${displayHour}시 ${minute}분`
    }
  }

  // 상품명 요약
  const firstProduct = order.items[0]?.productName || ''
  const totalCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const productSummary = `${firstProduct} 외 ${totalCount}개`

  // 배송방법 텍스트
  const deliveryMethodText = order.deliveryMethod || '매장 픽업'

  // 주문 상태 텍스트 및 스타일
  const getOrderStatusBadge = () => {
    let statusText = ''
    let statusClass = ''

    switch (order.orderStatus) {
      case 'pending':
        statusText = '신규주문'
        statusClass = styles.statusPending
        break
      case 'preparing':
        statusText = '준비중'
        statusClass = styles.statusPreparing
        break
      case 'shipping':
        statusText = '배송·픽업중'
        statusClass = styles.statusShipping
        break
      case 'completed':
        statusText = '완료'
        statusClass = styles.statusCompleted
        break
      case 'rejected':
        statusText = '판매자 취소'
        statusClass = styles.statusCancelled
        break
      case 'cancelled':
        statusText = '고객 취소'
        statusClass = styles.statusCancelled
        break
      default:
        statusText = order.orderStatus
        statusClass = ''
    }

    return <div className={`${styles.statusBadge} ${statusClass}`}>{statusText}</div>
  }

  return (
    <div className={`${styles.orderCard} ${order.orderStatus === 'pending' ? styles.orderCardPending : ''} ${isExpanded ? styles.orderCardExpanded : ''}`}>
      <div className={styles.cardContentWrapper}>
        <div className={styles.cardLeft}>
          <div className={styles.orderHeader}>
            {getOrderStatusBadge()}
            <div className={styles.deliveryBadge}>{deliveryMethodText}</div>
            <div className={styles.dDay}>{dDay}</div>
            <span className={styles.orderNumberText}>주문번호 {order.orderNumber || order.id}</span>
          </div>
          <div className={styles.productName}>{productSummary}</div>
          <div className={styles.orderInfo}>예약날짜 {formattedReservation}</div>
          <div className={styles.orderInfo}>
            {order.paymentStatus === 'refunded' ? '환불완료' : '결제완료'} {formatCurrency(order.totalProductPrice)}
          </div>
        </div>
        <div className={styles.cardRight}>
          <div className={styles.actionRow}>
            <button
              className={styles.actionBtn}
              onClick={() => onOpenChat(order)}
            >
              <Image
                src="/partner-menu-icons/chat.png"
                alt="채팅"
                width={16}
                height={16}
                quality={100}
                unoptimized
              />
              채팅
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => handlePhoneClick(order)}
            >
              <Image
                src="/icons/phone.png"
                alt="전화"
                width={16}
                height={16}
                quality={100}
                unoptimized
              />
              전화
            </button>
            <button
              className={styles.actionBtn}
              onClick={onToggleExpand}
            >
              <Image
                src="/partner-menu-icons/order.png"
                alt="주문상세"
                width={16}
                height={16}
                quality={100}
                unoptimized
              />
              주문상세
            </button>
          </div>
          {(order.orderStatus === 'pending' || order.orderStatus === 'preparing' || order.orderStatus === 'shipping') && order.id && (
            <div className={styles.actionRow}>
              {order.orderStatus === 'pending' && (
                <>
                  <button
                    className={`${styles.actionBtn} ${styles.cancelBtn}`}
                    onClick={() => onOpenCancelModal(order.id!)}
                  >
                    전체 주문 취소
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.acceptBtn}`}
                    onClick={() => onStatusUpdate(order.id!, 'preparing')}
                  >
                    주문접수
                  </button>
                </>
              )}
              {order.orderStatus === 'preparing' && (
                <>
                  <button
                    className={`${styles.actionBtn} ${styles.cancelBtn}`}
                    onClick={() => onOpenCancelModal(order.id!)}
                  >
                    전체 주문 취소
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.acceptBtn}`}
                    onClick={() => {
                      if (order.deliveryMethod === '택배 배송') {
                        onOpenTrackingModal(order.id!)
                      } else {
                        onStatusUpdate(order.id!, 'shipping')
                      }
                    }}
                  >
                    준비완료
                  </button>
                </>
              )}
              {order.orderStatus === 'shipping' && (
                <button
                  className={`${styles.actionBtn} ${styles.acceptBtn}`}
                  onClick={() => onStatusUpdate(order.id!, 'completed')}
                >
                  완료
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 주문 상세 정보 */}
      {isExpanded && (
        <div className={styles.orderDetails}>
          <div className={styles.detailsLeft}>
            <div className={styles.detailCard}>
              <div className={styles.detailTitleRow}>
                <h3 className={styles.detailTitle}>주문정보</h3>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>주문일시</span>
                <span className={styles.detailValue}>{formatDate(order.createdAt)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>주문번호</span>
                <span className={styles.detailValue}>{order.orderNumber || order.id}</span>
              </div>

              <div className={styles.detailSectionDivider}></div>

              <div className={styles.detailTitleRow}>
                <h3 className={styles.detailTitle}>주문상품</h3>
                {order.orderStatus === 'preparing' && (
                  <div className={styles.additionalOrderToggle}>
                    <Image
                      src="/icons/info.svg"
                      alt="정보"
                      width={20}
                      height={20}
                    />
                    <span className={styles.additionalOrderLabel}>추가주문허용</span>
                    <button
                      className={styles.toggleButton}
                      onClick={handleToggleAdditionalOrder}
                      type="button"
                    >
                      <Image
                        src={allowAdditionalOrder ? "/icons/toggle-on.svg" : "/icons/toggle-off.svg"}
                        alt="토글"
                        width={41}
                        height={25}
                      />
                    </button>
                  </div>
                )}
              </div>
              {/* Regular order items */}
              {order.items.filter(item => !item.isAddItem).map((item, index, filteredItems) => {
                const showProductName = index === 0 || filteredItems[index - 1].productName !== item.productName
                const hasOptions = Object.keys(item.options || {}).length > 0
                const hasAdditionalOptions = item.additionalOptions && Object.keys(item.additionalOptions).length > 0

                return (
                  <div key={index} className={styles.orderItemSection}>
                    {showProductName && (
                      <span className={styles.orderItemName}>{item.productName}</span>
                    )}

                    {/* 모든 상품에 대해 orderItemContent 표시 */}
                    <div className={styles.orderItemContent}>
                        <div className={styles.orderItemLeft}>
                          {/* 상품 옵션 */}
                          {hasOptions ? (
                            <div className={styles.optionGroup}>
                              <div className={styles.optionGroupTitle}>상품 옵션</div>
                              {Object.entries(item.options).map(([key, value], optIdx) => {
                                let optionPrice = 0
                                if (item.optionsWithPrices && item.optionsWithPrices[key]) {
                                  optionPrice = item.optionsWithPrices[key].price
                                }
                                return (
                                  <div key={optIdx} className={styles.orderItemOption}>
                                    [{key}] {value} {optionPrice > 0 && `+${optionPrice.toLocaleString()}원`}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className={styles.optionGroup}>
                              <div className={styles.optionGroupTitle}>상품 옵션</div>
                              <div className={styles.orderItemOption}>
                                [기본] 기본 +0원
                              </div>
                            </div>
                          )}

                          {/* 추가상품 */}
                          {item.additionalOptions && Object.keys(item.additionalOptions).length > 0 && (
                            <div className={styles.optionGroup}>
                              <div className={styles.optionGroupTitle}>추가상품</div>
                              {Object.entries(item.additionalOptions).map(([key, value], optIdx) => {
                                let optionPrice = 0
                                if (item.additionalOptionsWithPrices && item.additionalOptionsWithPrices[key]) {
                                  optionPrice = item.additionalOptionsWithPrices[key].price
                                }
                                return (
                                  <div key={optIdx} className={styles.orderItemOption}>
                                    [{key}] {value} {optionPrice > 0 && `+${optionPrice.toLocaleString()}원`}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        <div className={styles.orderItemRight}>
                          <span className={styles.orderItemQuantity}>{item.quantity}개</span>
                          <span className={styles.orderItemPrice}>{formatCurrency(item.itemPrice || item.price * item.quantity)}</span>
                        </div>
                      </div>
                  </div>
                )
              })}

              {/* Additional order items section */}
              {order.items.some(item => item.isAddItem) && (
                <>
                  {/* 추가주문 상품을 paymentId로 그룹화 */}
                  {(() => {
                    const additionalItems = order.items.filter(item => item.isAddItem)
                    const groupedByPaymentId: { [paymentId: string]: typeof additionalItems } = {}

                    additionalItems.forEach(item => {
                      const paymentId = item.paymentId || 'unknown'
                      if (!groupedByPaymentId[paymentId]) {
                        groupedByPaymentId[paymentId] = []
                      }
                      groupedByPaymentId[paymentId].push(item)
                    })

                    return Object.entries(groupedByPaymentId).map(([paymentId, items], groupIndex) => {
                      // 해당 그룹의 총 금액 계산
                      const groupTotalAmount = items.reduce((sum, item) => {
                        return sum + (item.itemPrice || (item.price * item.quantity))
                      }, 0)

                      return (
                        <div key={paymentId}>
                          <div className={styles.detailSectionDivider}></div>
                          <div className={styles.detailTitleRow}>
                            <h3 className={styles.detailTitle}>추가주문상품 #{groupIndex + 1}</h3>
                          </div>
                          {items.map((item, index) => {
                            const showProductName = index === 0 || items[index - 1].productName !== item.productName
                            const hasOptions = Object.keys(item.options || {}).length > 0
                            const hasAdditionalOptions = item.additionalOptions && Object.keys(item.additionalOptions).length > 0

                            return (
                              <div key={index} className={styles.orderItemSection}>
                                {showProductName && (
                                  <span className={styles.orderItemName}>{item.productName}</span>
                                )}

                                {/* 모든 상품에 대해 orderItemContent 표시 */}
                                <div className={styles.orderItemContent}>
                                    <div className={styles.orderItemLeft}>
                                      {/* 상품 옵션 */}
                                      {hasOptions ? (
                                        <div className={styles.optionGroup}>
                                          <div className={styles.optionGroupTitle}>상품 옵션</div>
                                          {Object.entries(item.options).map(([key, value], optIdx) => {
                                            let optionPrice = 0
                                            if (item.optionsWithPrices && item.optionsWithPrices[key]) {
                                              optionPrice = item.optionsWithPrices[key].price
                                            }
                                            return (
                                              <div key={optIdx} className={styles.orderItemOption}>
                                                [{key}] {value} {optionPrice > 0 && `+${optionPrice.toLocaleString()}원`}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <div className={styles.optionGroup}>
                                          <div className={styles.optionGroupTitle}>상품 옵션</div>
                                          <div className={styles.orderItemOption}>
                                            [기본] 기본 +0원
                                          </div>
                                        </div>
                                      )}

                                      {/* 추가상품 */}
                                      {item.additionalOptions && Object.keys(item.additionalOptions).length > 0 && (
                                        <div className={styles.optionGroup}>
                                          <div className={styles.optionGroupTitle}>추가상품</div>
                                          {Object.entries(item.additionalOptions).map(([key, value], optIdx) => {
                                            let optionPrice = 0
                                            if (item.additionalOptionsWithPrices && item.additionalOptionsWithPrices[key]) {
                                              optionPrice = item.additionalOptionsWithPrices[key].price
                                            }
                                            return (
                                              <div key={optIdx} className={styles.orderItemOption}>
                                                [{key}] {value} {optionPrice > 0 && `+${optionPrice.toLocaleString()}원`}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    <div className={styles.orderItemRight}>
                                      <span className={styles.orderItemQuantity}>{item.quantity}개</span>
                                      <span className={styles.orderItemPrice}>{formatCurrency(item.itemPrice || item.price * item.quantity)}</span>
                                    </div>
                                  </div>
                              </div>
                            )
                          })}

                          {/* 추가주문 취소 버튼 */}
                          {(order.orderStatus === 'preparing' || order.orderStatus === 'shipping') && (
                            <div className={styles.cancelAdditionalOrderButtonWrapper}>
                              <button
                                className={styles.cancelAdditionalOrderButton}
                                onClick={() => handleCancelAdditionalOrder(paymentId)}
                                disabled={isCancelingAdditional}
                                type="button"
                              >
                                {isCancelingAdditional ? '취소 처리 중...' : '추가주문 취소하기'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </>
              )}

              <div className={styles.detailSectionDivider}></div>

              <div className={styles.detailTitleRow}>
                <h3 className={styles.detailTitle}>결제정보</h3>
              </div>
              <div className={styles.totalSection}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>총 상품갯수</span>
                  <span className={styles.totalValue}>{order.totalQuantity || order.items.reduce((sum, item) => sum + item.quantity, 0)}개</span>
                </div>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>총 상품금액</span>
                  <span className={styles.totalProductValue}>
                    {formatCurrency(order.totalProductPrice)}
                  </span>
                </div>
              </div>

              <div className={styles.detailSectionDivider}></div>

              <div className={styles.detailTitleRow}>
                <h3 className={styles.detailTitle}>매장요청</h3>
              </div>
              <div className={styles.requestText}>
                {order.request || order.detailedRequest || '요청사항이 없습니다.'}
              </div>

              <div className={styles.detailSectionDivider}></div>

              <div className={styles.detailTitleRow}>
                <h3 className={styles.detailTitle}>메모</h3>
              </div>
              <div className={styles.memoSection}>
                <textarea
                  className={styles.memoTextarea}
                  placeholder="주문에 대한 메모를 입력하세요"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={4}
                />
                <button
                  className={styles.memoSaveButton}
                  onClick={handleSaveMemo}
                  disabled={isSavingMemo}
                >
                  {isSavingMemo ? '저장 중...' : '메모 저장'}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.detailsRight}>
            {order.deliveryMethod === '퀵업체 배송' ? (
              <>
                {/* 퀵업체 배송 */}
                <div className={styles.detailCard}>
                  <div className={styles.detailTitleRow}>
                    <h3 className={styles.detailTitle}>배송날짜</h3>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송날짜</span>
                    <span className={styles.detailValue}>
                      {actualDeliveryDate ? (() => {
                        const date = new Date(actualDeliveryDate)
                        const year = date.getFullYear()
                        const month = date.getMonth() + 1
                        const day = date.getDate()
                        const weekdays = ['일', '월', '화', '수', '목', '금', '토']
                        const weekday = weekdays[date.getDay()]
                        return `${year}년 ${month}월 ${day}일 (${weekday})`
                      })() : '-'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송시간</span>
                    <span className={styles.detailValue}>
                      {actualDeliveryTime ? (() => {
                        const [hour, minute] = actualDeliveryTime.split(':').map(Number)
                        const period = hour >= 12 ? '오후' : '오전'
                        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                        return `${period} ${displayHour}시 ${minute}분`
                      })() : '-'}
                    </span>
                  </div>

                  <div className={styles.detailSectionDivider}></div>

                  <div className={styles.detailTitleRow}>
                    <h3 className={styles.detailTitle}>배송정보</h3>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송방법</span>
                    <span className={styles.detailValue}>퀵 업체 배송</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송비</span>
                    <span className={styles.detailValue}>{getDeliveryFeeText()}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송주소</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.address || order.address}
                      {(order.deliveryInfo?.detailAddress || order.detailAddress) && ` (${order.deliveryInfo?.detailAddress || order.detailAddress})`}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송지명</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.addressName || '-'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>수령인</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.recipient || order.recipient}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>전화번호</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.recipientPhone || order.phone}
                    </span>
                  </div>

                  <div className={styles.detailSectionDivider}></div>

                  {/* 기사 정보 */}
                  {order.quickDeliveryOrderNo && (
                    <>
                      <div className={styles.detailTitleRow}>
                        <h3 className={styles.detailTitle}>기사 정보</h3>
                      </div>
                      {driverInfo ? (
                        <>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>배차 상태</span>
                            <span className={styles.detailValue} style={{ color: '#4CAF50', fontWeight: 600 }}>
                              배차 완료
                            </span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>기사명</span>
                            <span className={styles.detailValue}>
                              {driverInfo.rName}
                            </span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>연락처</span>
                            <span className={styles.detailValue}>
                              <a href={`tel:${driverInfo.rMobile}`} style={{ color: '#2196F3', textDecoration: 'none' }}>
                                {driverInfo.rMobile}
                              </a>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>배차 상태</span>
                          <span className={styles.detailValue} style={{ color: '#FF9800', fontWeight: 600 }}>
                            퀵기사님 배차중
                          </span>
                        </div>
                      )}

                      <div className={styles.detailSectionDivider}></div>
                    </>
                  )}

                  <div className={styles.detailTitleRow}>
                    <h3 className={styles.detailTitle}>배송요청</h3>
                  </div>
                  {order.deliveryInfo?.entrancePassword && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>공동현관</span>
                      <span className={styles.detailValue}>
                        {order.deliveryInfo.entrancePassword}
                      </span>
                    </div>
                  )}
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송요청</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.deliveryRequest || '없음'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>상세요청</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.detailedRequest || '없음'}
                    </span>
                  </div>
                </div>
              </>
            ) : order.deliveryMethod === '택배 배송' ? (
              <>
                {/* 택배 배송 */}
                <div className={styles.detailCard}>
                  <div className={styles.detailTitleRow}>
                    <h3 className={styles.detailTitle}>배송날짜</h3>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송날짜</span>
                    <span className={styles.detailValue}>
                      {actualDeliveryDate ? (() => {
                        const date = new Date(actualDeliveryDate)
                        const year = date.getFullYear()
                        const month = date.getMonth() + 1
                        const day = date.getDate()
                        const weekdays = ['일', '월', '화', '수', '목', '금', '토']
                        const weekday = weekdays[date.getDay()]
                        return `${year}년 ${month}월 ${day}일 (${weekday})`
                      })() : '-'}
                    </span>
                  </div>

                  <div className={styles.detailSectionDivider}></div>

                  <div className={styles.detailTitleRow}>
                    <h3 className={styles.detailTitle}>배송정보</h3>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송방법</span>
                    <span className={styles.detailValue}>택배 배송</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송비</span>
                    <span className={styles.detailValue}>{getDeliveryFeeText()}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>결제방식</span>
                    <span className={styles.detailValue}>
                      {order.deliveryFee && order.deliveryFee > 0 ? '선결제' : '착불'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송주소</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.address || order.address}
                      {(order.deliveryInfo?.detailAddress || order.detailAddress) && ` (${order.deliveryInfo?.detailAddress || order.detailAddress})`}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송지명</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.addressName || '-'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>수령인</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.recipient || order.recipient}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>전화번호</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.recipientPhone || order.phone}
                    </span>
                  </div>

                  <div className={styles.detailSectionDivider}></div>

                  <div className={styles.detailTitleRow}>
                    <h3 className={styles.detailTitle}>택배정보</h3>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>택배사</span>
                    <span className={styles.detailValue}>{order.trackingInfo?.carrier || order.carrier || '-'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>송장번호</span>
                    <div className={styles.trackingNumberRow}>
                      <span className={styles.detailValue}>{order.trackingInfo?.trackingNumber || order.trackingNumber || '-'}</span>
                      <button
                        className={styles.editTrackingBtn}
                        onClick={() => onOpenTrackingModal(order.id!)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.334 2.00004C11.5091 1.82494 11.7169 1.68605 11.9457 1.59129C12.1745 1.49653 12.4197 1.44775 12.6673 1.44775C12.9149 1.44775 13.1601 1.49653 13.3889 1.59129C13.6177 1.68605 13.8256 1.82494 14.0007 2.00004C14.1758 2.17513 14.3147 2.383 14.4094 2.61178C14.5042 2.84055 14.553 3.08575 14.553 3.33337C14.553 3.58099 14.5042 3.82619 14.4094 4.05497C14.3147 4.28374 14.1758 4.49161 14.0007 4.66671L5.00065 13.6667L1.33398 14.6667L2.33398 11L11.334 2.00004Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className={styles.detailSectionDivider}></div>

                  <div className={styles.detailTitleRow}>
                    <h3 className={styles.detailTitle}>배송요청</h3>
                  </div>
                  {order.deliveryInfo?.entrancePassword && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>공동현관</span>
                      <span className={styles.detailValue}>
                        {order.deliveryInfo.entrancePassword}
                      </span>
                    </div>
                  )}
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송요청</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.deliveryRequest || '없음'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>상세요청</span>
                    <span className={styles.detailValue}>
                      {order.deliveryInfo?.detailedRequest || '없음'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 매장 픽업 */}
                <div className={styles.detailCard}>
                  <div className={styles.detailTitleRow}>
                    <h3 className={styles.detailTitle}>픽업날짜</h3>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>픽업날짜</span>
                    <span className={styles.detailValue}>
                      {actualDeliveryDate ? (() => {
                        const date = new Date(actualDeliveryDate)
                        const year = date.getFullYear()
                        const month = date.getMonth() + 1
                        const day = date.getDate()
                        const weekdays = ['일', '월', '화', '수', '목', '금', '토']
                        const weekday = weekdays[date.getDay()]
                        return `${year}년 ${month}월 ${day}일 (${weekday})`
                      })() : '-'}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>픽업시간</span>
                    <span className={styles.detailValue}>
                      {actualDeliveryTime ? (() => {
                        const [hour, minute] = actualDeliveryTime.split(':').map(Number)
                        const period = hour >= 12 ? '오후' : '오전'
                        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                        return `${period} ${displayHour}시 ${minute}분`
                      })() : '-'}
                    </span>
                  </div>

                  <div className={styles.detailSectionDivider}></div>

                  <div className={styles.detailTitleRow}>
                    <h3 className={styles.detailTitle}>수령인 정보</h3>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>수령인</span>
                    <span className={styles.detailValue}>{order.deliveryInfo?.recipient || order.recipient}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>전화번호</span>
                    <span className={styles.detailValue}>{order.deliveryInfo?.recipientPhone || order.phone}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 주문서 출력 버튼 */}
      {isExpanded && (
        <button
          className={styles.printOrderButton}
          onClick={onPrint}
        >
          주문서 출력
        </button>
      )}
    </div>
  )
}
