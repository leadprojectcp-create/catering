'use client'

import Image from 'next/image'
import { OrderData } from '../types'
import styles from './OrderProductSection.module.css'

interface OrderProductSectionProps {
  orderData: OrderData | null
}

export default function OrderProductSection({ orderData }: OrderProductSectionProps) {
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
                {/* 상품명 - 한 번만 표시 */}
                <div className={styles.productNameRow}>
                  <div className={styles.productName}>{orderData.productName}</div>
                </div>

                {/* 각 아이템의 옵션들만 반복 */}
                {orderData.items.map((item, index) => (
                  <div key={index}>
                    {/* 옵션이 없을 때는 수량만 표시 */}
                    {Object.keys(item.options).length === 0 && (!item.additionalOptions || Object.keys(item.additionalOptions).length === 0) ? (
                      <div className={styles.productQuantity}>{item.quantity}개</div>
                    ) : (
                      /* 옵션이나 추가상품이 있을 때만 productDetailsBox 표시 */
                      <div className={styles.productDetailsBox}>
                        <div className={styles.productDetailsLeft}>
                          {/* 상품 옵션 */}
                          {Object.keys(item.options).length > 0 && (
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
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
