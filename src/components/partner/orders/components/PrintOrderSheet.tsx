'use client'

import { Order } from '@/lib/services/orderService'
import { Timestamp, FieldValue } from 'firebase/firestore'
import styles from './PrintOrderSheet.module.css'

interface PrintOrderSheetProps {
  order: Order
  driverInfo?: { rName: string; rMobile: string } | null
}

export default function PrintOrderSheet({ order, driverInfo }: PrintOrderSheetProps) {
  const formatDate = (date: Date | Timestamp | FieldValue | undefined) => {
    if (!date) return '-'
    const d = date instanceof Timestamp ? date.toDate() : new Date(date as unknown as string)
    return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()}원`
  }

  // 실제 배송 날짜/시간 추출
  const actualDeliveryDate = order.deliveryInfo?.deliveryDate || order.deliveryDate
  const actualDeliveryTime = order.deliveryInfo?.deliveryTime || order.deliveryTime

  return (
    <div className={`${styles.printSheet} print-order-sheet`}>
      <div className={styles.header}>
        <h1 className={styles.title}>주문서</h1>
        <div className={styles.orderNumber}>주문번호: {order.orderNumber || order.id}</div>
        <div className={styles.orderDate}>주문일시: {formatDate(order.createdAt)}</div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>주문 상품</h2>
        {order.items.filter(item => !item.isAddItem).map((item, index, filteredItems) => {
          const showProductName = index === 0 || filteredItems[index - 1].productName !== item.productName
          return (
            <div key={index} className={styles.itemSection}>
              {showProductName && (
                <div className={styles.productName}>{item.productName}</div>
              )}

              <div className={styles.itemDetails}>
                {/* 상품 옵션 */}
                {Object.keys(item.options).length > 0 ? (
                  <div className={styles.optionGroup}>
                    <div className={styles.optionTitle}>상품 옵션</div>
                    {Object.entries(item.options).map(([key, value], optIdx) => {
                      let optionPrice = 0
                      if (item.optionsWithPrices && item.optionsWithPrices[key]) {
                        optionPrice = item.optionsWithPrices[key].price
                      }
                      return (
                        <div key={optIdx} className={styles.option}>
                          [{key}] {value} {optionPrice > 0 && `+${optionPrice.toLocaleString()}원`}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={styles.optionGroup}>
                    <div className={styles.option}>기본</div>
                  </div>
                )}

                {/* 추가상품 */}
                {item.additionalOptions && Object.keys(item.additionalOptions).length > 0 && (
                  <div className={styles.optionGroup}>
                    <div className={styles.optionTitle}>추가상품</div>
                    {Object.entries(item.additionalOptions).map(([key, value], optIdx) => {
                      let optionPrice = 0
                      if (item.additionalOptionsWithPrices && item.additionalOptionsWithPrices[key]) {
                        optionPrice = item.additionalOptionsWithPrices[key].price
                      }
                      return (
                        <div key={optIdx} className={styles.option}>
                          [{key}] {value} {optionPrice > 0 && `+${optionPrice.toLocaleString()}원`}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className={styles.itemPrice}>
                  <span>수량: {item.quantity}개</span>
                  <span>{formatCurrency(item.itemPrice || (item.price * item.quantity))}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 추가 주문 상품 섹션 */}
      {order.items.some(item => item.isAddItem) && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>추가주문상품</h2>
          {order.items.filter(item => item.isAddItem).map((item, index, filteredItems) => {
            const showProductName = index === 0 || filteredItems[index - 1].productName !== item.productName
            return (
              <div key={index} className={styles.itemSection}>
                {showProductName && (
                  <div className={styles.productName}>{item.productName}</div>
                )}

                <div className={styles.itemDetails}>
                  {/* 상품 옵션 */}
                  {Object.keys(item.options).length > 0 ? (
                    <div className={styles.optionGroup}>
                      <div className={styles.optionTitle}>상품 옵션</div>
                      {Object.entries(item.options).map(([key, value], optIdx) => {
                        let optionPrice = 0
                        if (item.optionsWithPrices && item.optionsWithPrices[key]) {
                          optionPrice = item.optionsWithPrices[key].price
                        }
                        return (
                          <div key={optIdx} className={styles.option}>
                            [{key}] {value} {optionPrice > 0 && `+${optionPrice.toLocaleString()}원`}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className={styles.optionGroup}>
                      <div className={styles.option}>기본</div>
                    </div>
                  )}

                  {/* 추가상품 */}
                  {item.additionalOptions && Object.keys(item.additionalOptions).length > 0 && (
                    <div className={styles.optionGroup}>
                      <div className={styles.optionTitle}>추가상품</div>
                      {Object.entries(item.additionalOptions).map(([key, value], optIdx) => {
                        let optionPrice = 0
                        if (item.additionalOptionsWithPrices && item.additionalOptionsWithPrices[key]) {
                          optionPrice = item.additionalOptionsWithPrices[key].price
                        }
                        return (
                          <div key={optIdx} className={styles.option}>
                            [{key}] {value} {optionPrice > 0 && `+${optionPrice.toLocaleString()}원`}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className={styles.itemPrice}>
                    <span>수량: {item.quantity}개</span>
                    <span>{formatCurrency(item.itemPrice || (item.price * item.quantity))}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>결제 정보</h2>
        <div className={styles.row}>
          <span>총 상품갯수</span>
          <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)}개</span>
        </div>
        <div className={styles.row}>
          <span>총 상품금액</span>
          <span>{formatCurrency(order.totalProductPrice)}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>매장 요청사항</h2>
        <div className={styles.request}>
          {order.request || order.detailedRequest || '요청사항이 없습니다.'}
        </div>
      </div>

      {order.partnerMemo && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>메모</h2>
          <div className={styles.request}>
            {order.partnerMemo}
          </div>
        </div>
      )}

      {order.deliveryMethod === '퀵업체 배송' ? (
        <>
          {/* 퀵업체 배송 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>배송 정보</h2>
            <div className={styles.row}>
              <span>배송방법</span>
              <span>퀵 업체 배송</span>
            </div>
            <div className={styles.row}>
              <span>배송날짜</span>
              <span>
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
            <div className={styles.row}>
              <span>배송시간</span>
              <span>
                {actualDeliveryTime ? (() => {
                  const [hour, minute] = actualDeliveryTime.split(':').map(Number)
                  const period = hour >= 12 ? '오후' : '오전'
                  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                  return `${period} ${displayHour}시 ${minute}분`
                })() : '-'}
              </span>
            </div>
            <div className={styles.row}>
              <span>배송주소</span>
              <span>
                {order.deliveryInfo?.address || order.address}
                {(order.deliveryInfo?.detailAddress || order.detailAddress) && ` (${order.deliveryInfo?.detailAddress || order.detailAddress})`}
              </span>
            </div>
            <div className={styles.row}>
              <span>배송지명</span>
              <span>{order.deliveryInfo?.addressName || '-'}</span>
            </div>
            <div className={styles.row}>
              <span>수령인</span>
              <span>{order.deliveryInfo?.recipient || order.recipient}</span>
            </div>
            <div className={styles.row}>
              <span>전화번호</span>
              <span>{order.deliveryInfo?.recipientPhone || order.phone}</span>
            </div>

            {/* 기사 정보 */}
            {order.quickDeliveryOrderNo && (
              <>
                <div className={styles.sectionDivider}></div>
                <h3 className={styles.subTitle}>기사 정보</h3>
                {driverInfo ? (
                  <>
                    <div className={styles.row}>
                      <span>배차 상태</span>
                      <span style={{ fontWeight: 600 }}>배차 완료</span>
                    </div>
                    <div className={styles.row}>
                      <span>기사명</span>
                      <span>{driverInfo.rName}</span>
                    </div>
                    <div className={styles.row}>
                      <span>연락처</span>
                      <span>{driverInfo.rMobile}</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.row}>
                    <span>배차 상태</span>
                    <span style={{ fontWeight: 600 }}>퀵기사님 배차중</span>
                  </div>
                )}
              </>
            )}

            <div className={styles.sectionDivider}></div>
            <h3 className={styles.subTitle}>배송요청</h3>
            {order.deliveryInfo?.entrancePassword && (
              <div className={styles.row}>
                <span>공동현관</span>
                <span>{order.deliveryInfo.entrancePassword}</span>
              </div>
            )}
            <div className={styles.row}>
              <span>배송요청</span>
              <span>{order.deliveryInfo?.deliveryRequest || '없음'}</span>
            </div>
            <div className={styles.row}>
              <span>상세요청</span>
              <span>{order.deliveryInfo?.detailedRequest || '없음'}</span>
            </div>
          </div>
        </>
      ) : order.deliveryMethod === '택배 배송' ? (
        <>
          {/* 택배 배송 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>배송 정보</h2>
            <div className={styles.row}>
              <span>배송방법</span>
              <span>택배 배송</span>
            </div>
            <div className={styles.row}>
              <span>배송날짜</span>
              <span>
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
            <div className={styles.row}>
              <span>배송시간</span>
              <span>
                {actualDeliveryTime ? (() => {
                  const [hour, minute] = actualDeliveryTime.split(':').map(Number)
                  const period = hour >= 12 ? '오후' : '오전'
                  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                  return `${period} ${displayHour}시 ${minute}분`
                })() : '-'}
              </span>
            </div>
            <div className={styles.row}>
              <span>배송주소</span>
              <span>
                {order.deliveryInfo?.address || order.address}
                {(order.deliveryInfo?.detailAddress || order.detailAddress) && ` (${order.deliveryInfo?.detailAddress || order.detailAddress})`}
              </span>
            </div>
            <div className={styles.row}>
              <span>배송지명</span>
              <span>{order.deliveryInfo?.addressName || '-'}</span>
            </div>
            <div className={styles.row}>
              <span>수령인</span>
              <span>{order.deliveryInfo?.recipient || order.recipient}</span>
            </div>
            <div className={styles.row}>
              <span>전화번호</span>
              <span>{order.deliveryInfo?.recipientPhone || order.phone}</span>
            </div>

            <div className={styles.sectionDivider}></div>
            <h3 className={styles.subTitle}>택배 정보</h3>
            <div className={styles.row}>
              <span>택배사</span>
              <span>{order.carrier || '-'}</span>
            </div>
            <div className={styles.row}>
              <span>송장번호</span>
              <span>{order.trackingNumber || '-'}</span>
            </div>

            <div className={styles.sectionDivider}></div>
            <h3 className={styles.subTitle}>배송요청</h3>
            {order.deliveryInfo?.entrancePassword && (
              <div className={styles.row}>
                <span>공동현관</span>
                <span>{order.deliveryInfo.entrancePassword}</span>
              </div>
            )}
            <div className={styles.row}>
              <span>배송요청</span>
              <span>{order.deliveryInfo?.deliveryRequest || '없음'}</span>
            </div>
            <div className={styles.row}>
              <span>상세요청</span>
              <span>{order.deliveryInfo?.detailedRequest || '없음'}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 매장 픽업 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>픽업 정보</h2>
            <div className={styles.row}>
              <span>픽업방법</span>
              <span>매장 픽업</span>
            </div>
            <div className={styles.row}>
              <span>픽업날짜</span>
              <span>
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
            <div className={styles.row}>
              <span>픽업시간</span>
              <span>
                {actualDeliveryTime ? (() => {
                  const [hour, minute] = actualDeliveryTime.split(':').map(Number)
                  const period = hour >= 12 ? '오후' : '오전'
                  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                  return `${period} ${displayHour}시 ${minute}분`
                })() : '-'}
              </span>
            </div>
            <div className={styles.row}>
              <span>수령인</span>
              <span>{order.deliveryInfo?.recipient || order.recipient}</span>
            </div>
            <div className={styles.row}>
              <span>전화번호</span>
              <span>{order.deliveryInfo?.recipientPhone || order.phone}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
