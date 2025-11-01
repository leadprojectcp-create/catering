'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { OrderData, OrderItem } from '../types'
import styles from './OrderProductSection.module.css'

interface OrderProductSectionProps {
  orderData: OrderData | null
  orderId: string | null
  isCartMode: boolean
  additionalOrderId: string | null
}

export default function OrderProductSection({ orderData, orderId, isCartMode, additionalOrderId }: OrderProductSectionProps) {
  const router = useRouter()

  const handleEditProduct = () => {
    if (!orderData || !orderId) return

    // 추가 주문 모드인 경우
    if (additionalOrderId) {
      router.push(`/productDetail/${orderData.productId}?additionalOrderId=${additionalOrderId}&mode=edit`)
      return
    }

    // cartMode면 cartItemId로, 아니면 orderId로 전달
    const paramName = isCartMode ? 'cartItemId' : 'orderId'
    router.push(`/productDetail/${orderData.productId}?${paramName}=${orderId}`)
  }
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>주문상품</h2>
      <div className={styles.productContainer}>
        {orderData && (
          <div className={styles.productList}>
            {orderData.storeName && <div className={styles.storeName}>{orderData.storeName}</div>}
            <div className={styles.productItem}>
              {/* 상품 이미지 - 한 번만 표시 */}
              {orderData.productImage && orderData.productImage.trim() !== '' ? (
                <Image
                  src={orderData.productImage}
                  alt={orderData.productName}
                  width={100}
                  height={100}
                  quality={100}
                  className={styles.productImage}
                />
              ) : (
                <div className={styles.productImage} style={{ background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#999', fontSize: '12px' }}>이미지 없음</span>
                </div>
              )}
              <div className={styles.productInfo}>
                {/* 상품명과 수정 버튼 */}
                <div className={styles.productNameAndButton}>
                  <div className={styles.productName}>{orderData.productName}</div>
                  <button
                    onClick={handleEditProduct}
                    className={styles.editButton}
                  >
                    주문수정
                  </button>
                </div>

                {/* 각 아이템의 옵션들만 반복 */}
                {/* additionalOrderId가 있으면 paymentId 없는 항목 표시, 없으면 isAddItem=false인 항목 표시 */}
                {(() => {
                  let itemsToDisplay: OrderItem[] = []

                  if (additionalOrderId) {
                    // 추가 주문 결제 모드 (결제 전): paymentId가 없는 항목들 (방금 추가된 것들)
                    itemsToDisplay = orderData.items.filter(item => !item.paymentId)
                  } else {
                    // 일반 모드: 최초 주문 상품만 표시 (isAddItem이 false이거나 없는 것들)
                    itemsToDisplay = orderData.items.filter(item => !item.isAddItem)
                  }

                  return itemsToDisplay.map((item, index) => (
                    <div key={index}>
                      <div className={styles.productDetailsBox}>
                        <div className={styles.productDetailsLeft}>
                          {/* 상품 옵션 */}
                          {Object.keys(item.options).length > 0 ? (
                            <div className={styles.optionSection}>
                              <div className={styles.optionSectionTitle}>상품 옵션</div>
                              <div className={styles.productOptions}>
                                {Object.entries(item.options).map(([key, value]) => {
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
                                })}
                              </div>
                            </div>
                          ) : (
                            /* 필수 옵션이 없을 때 기본 옵션 표시 */
                            <div className={styles.optionSection}>
                              <div className={styles.optionSectionTitle}>상품 옵션</div>
                              <div className={styles.productOptions}>
                                <div className={styles.optionItem}>
                                  <span className={styles.optionGroup}>[기본]</span>
                                  <span>[기본] +0원</span>
                                </div>
                              </div>
                            </div>
                          )}

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
                          <div className={styles.productQuantity}>{item.quantity}개</div>
                        </div>
                      </div>
                    </div>
                  ))
                })()}

                {/* 추가 주문 내역 표시 (paymentId로 그룹핑) - 결제 완료 후에만 표시 */}
                {!additionalOrderId && (() => {
                  // isAddItem=true인 항목들만 필터링
                  const addItems = orderData.items.filter(item => item.isAddItem)

                  if (addItems.length === 0) return null

                  // paymentId로 그룹핑
                  const groupedByPaymentId: { [key: string]: OrderItem[] } = {}
                  addItems.forEach(item => {
                    const paymentId = item.paymentId || 'unknown'
                    if (!groupedByPaymentId[paymentId]) {
                      groupedByPaymentId[paymentId] = []
                    }
                    groupedByPaymentId[paymentId].push(item)
                  })

                  return (
                    <div className={styles.additionalOrdersSection}>
                      <div className={styles.additionalOrdersTitle}>추가 주문 내역</div>
                      {Object.entries(groupedByPaymentId).map(([paymentId, items], groupIndex) => (
                        <div key={paymentId} className={styles.additionalOrderGroup}>
                          <div className={styles.additionalOrderHeader}>추가 주문 {groupIndex + 1}</div>
                          {items.map((item, itemIndex) => (
                            <div key={`${paymentId}-${itemIndex}`}>
                              <div className={styles.productDetailsBox}>
                                <div className={styles.productDetailsLeft}>
                                  {/* 상품 옵션 */}
                                  {Object.keys(item.options).length > 0 ? (
                                    <div className={styles.optionSection}>
                                      <div className={styles.optionSectionTitle}>상품 옵션</div>
                                      <div className={styles.productOptions}>
                                        {Object.entries(item.options).map(([key, value]) => {
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
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={styles.optionSection}>
                                      <div className={styles.optionSectionTitle}>상품 옵션</div>
                                      <div className={styles.productOptions}>
                                        <div className={styles.optionItem}>
                                          <span className={styles.optionGroup}>[기본]</span>
                                          <span>[기본] +0원</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

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
                                  <div className={styles.productQuantity}>{item.quantity}개</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
