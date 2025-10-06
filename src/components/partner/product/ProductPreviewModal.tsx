'use client'

import { useState } from 'react'
import Image from 'next/image'
import orderStyles from '@/components/order/OrderPage.module.css'
import styles from './ProductPreviewModal.module.css'

interface Product {
  id: string
  name: string
  price: number
  discountedPrice?: number
  discount?: {
    discountAmount: number
    discountPercent: number
  }
  images?: string[]
  description?: string
  minOrderQuantity?: number
  maxOrderQuantity?: number
  deliveryMethods?: string[]
  additionalSettings?: string[]
  origin?: { ingredient: string; origin: string }[]
}

interface ProductPreviewModalProps {
  product: Product
  onClose: () => void
}

export default function ProductPreviewModal({ product, onClose }: ProductPreviewModalProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* 닫기 버튼 영역 */}
        <div className={styles.closeButtonWrapper}>
          <h2 className={styles.modalTitle}>상품 미리보기</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        {/* OrderPage leftSection 그대로 복사 */}
        <div className={orderStyles.leftSection}>
          {/* 상품 정보 카드 */}
          <div className={orderStyles.productCard}>
            <div className={orderStyles.productInfo}>
              <h1 className={orderStyles.productName}>{product.name}</h1>

              {/* 가격 정보 */}
              {product.discount ? (
                <>
                  <span className={orderStyles.originalPrice}>{product.price.toLocaleString()}원</span>
                  <div className={orderStyles.discountRow}>
                    <span className={orderStyles.discountedPrice}>{product.discountedPrice?.toLocaleString()}원</span>
                    <span className={orderStyles.discountPercent}>{product.discount.discountPercent}%</span>
                  </div>
                </>
              ) : (
                <span className={orderStyles.regularPrice}>{product.price.toLocaleString()}원</span>
              )}

              {/* 주문 가능 수량 */}
              {product.minOrderQuantity && product.maxOrderQuantity && (
                <div className={orderStyles.orderQuantity}>
                  주문가능 수량 최소 {product.minOrderQuantity}개 ~ 최대 {product.maxOrderQuantity}개
                </div>
              )}

              {/* 배송 방법 및 추가 설정 - PC용 */}
              <div className={orderStyles.badgeContainerDesktop}>
                <div className={orderStyles.badgeRow}>
                  {product.deliveryMethods?.map((method, index) => (
                    <span key={index} className={orderStyles.deliveryBadge}>{method}</span>
                  ))}
                </div>
                <div className={orderStyles.badgeRow}>
                  {product.additionalSettings?.map((setting, index) => (
                    <span key={index} className={orderStyles.settingBadge}>{setting}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* 상품 이미지 */}
            <div className={orderStyles.imageWrapper}>
              {product.images && product.images.length > 0 ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className={orderStyles.productImage}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div className={orderStyles.placeholderImage}>
                  <span>이미지 없음</span>
                </div>
              )}
            </div>

            {/* 배송 방법 및 추가 설정 - 모바일용 */}
            <div className={orderStyles.badgeContainerMobile}>
              <div className={orderStyles.badgeRow}>
                {product.deliveryMethods?.map((method, index) => (
                  <span key={index} className={orderStyles.deliveryBadge}>{method}</span>
                ))}
              </div>
              <div className={orderStyles.badgeRow}>
                {product.additionalSettings?.map((setting, index) => (
                  <span key={index} className={orderStyles.settingBadge}>{setting}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 상품 상세 설명 */}
          {product.description && (
            <div className={orderStyles.descriptionSection}>
              <h3 className={orderStyles.sectionTitle}>상품 상세 설명</h3>
              <div
                className={`${orderStyles.descriptionText} ${isDescriptionExpanded ? orderStyles.expanded : ''}`}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
              <button
                className={orderStyles.expandButton}
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? '상품 설명 접기' : '상품 설명 펼쳐보기'}
              </button>
            </div>
          )}

          {/* 원산지 표기 */}
          {product.origin && product.origin.length > 0 && (
            <div className={orderStyles.originSection}>
              <h3 className={orderStyles.sectionTitle}>원산지 표기</h3>
              <p className={orderStyles.originText}>
                {product.origin.map((item, index) => (
                  <span key={index}>
                    {item.ingredient}({item.origin}){index < product.origin!.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
