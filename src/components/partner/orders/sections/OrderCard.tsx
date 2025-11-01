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
}: OrderCardProps) {
  const [allowAdditionalOrder, setAllowAdditionalOrder] = useState(order.allowAdditionalOrder ?? false)

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

  const formatDate = (date: Date | Timestamp | FieldValue | undefined) => {
    if (!date) return '-'
    const d = typeof date === 'object' && 'toDate' in date ? (date as Timestamp).toDate() : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원'
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
      case 'cancelled':
        statusText = '주문취소'
        statusClass = styles.statusCancelled
        break
      default:
        statusText = order.orderStatus
        statusClass = ''
    }

    return <div className={`${styles.statusBadge} ${statusClass}`}>{statusText}</div>
  }

  return (
    <div className={`${styles.orderCard} ${isExpanded ? styles.orderCardExpanded : ''}`}>
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
            결제완료 {formatCurrency(order.totalProductPrice)}
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
                    주문취소
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
                    주문취소
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
              <h3 className={styles.detailTitle}>주문정보</h3>
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
                <h3 className={styles.detailTitle}>주문상품상세</h3>
                {order.orderStatus === 'preparing' && (
                  <div className={styles.additionalOrderToggle}>
                    <Image
                      src="/icons/info-circle.svg"
                      alt="정보"
                      width={16}
                      height={16}
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
              {order.items.map((item, index) => {
                const showProductName = index === 0 || order.items[index - 1].productName !== item.productName
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

              <div className={styles.detailSectionDivider}></div>

              <h3 className={styles.detailTitle}>결제정보</h3>
              <div className={styles.totalSection}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>총 상품갯수</span>
                  <span className={styles.totalValue}>{order.totalQuantity || order.items.reduce((sum, item) => sum + item.quantity, 0)}개</span>
                </div>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>총 상품금액</span>
                  <span className={styles.totalValue}>
                    {formatCurrency(order.totalProductPrice)}
                  </span>
                </div>
              </div>

              <div className={styles.detailSectionDivider}></div>

              <h3 className={styles.detailTitle}>매장요청</h3>
              <div className={styles.requestText}>
                {order.request || order.detailedRequest || '요청사항이 없습니다.'}
              </div>
            </div>
          </div>

          <div className={styles.detailsRight}>
            {order.deliveryMethod === '퀵업체 배송' ? (
              <>
                {/* 퀵업체 배송 */}
                <div className={styles.detailCard}>
                  <h3 className={styles.detailTitle}>배송날짜</h3>
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

                  <h3 className={styles.detailTitle}>배송정보</h3>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송방법</span>
                    <span className={styles.detailValue}>퀵 업체 배송</span>
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
                      <h3 className={styles.detailTitle}>기사 정보</h3>
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

                  <h3 className={styles.detailTitle}>배송요청</h3>
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
                  <h3 className={styles.detailTitle}>배송날짜</h3>
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

                  <h3 className={styles.detailTitle}>배송정보</h3>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>배송방법</span>
                    <span className={styles.detailValue}>택배 배송</span>
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

                  <h3 className={styles.detailTitle}>택배정보</h3>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>택배사</span>
                    <span className={styles.detailValue}>{order.carrier || '-'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>송장번호</span>
                    <div className={styles.trackingNumberRow}>
                      <span className={styles.detailValue}>{order.trackingNumber || '-'}</span>
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

                  <h3 className={styles.detailTitle}>배송요청</h3>
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
                  <h3 className={styles.detailTitle}>픽업날짜</h3>
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

                  <h3 className={styles.detailTitle}>수령인 정보</h3>
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
