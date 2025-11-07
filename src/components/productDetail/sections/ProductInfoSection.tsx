'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { Product, Store } from '../types'
import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './ProductInfoSection.module.css'

interface ProductInfoSectionProps {
  product: Product
  store: Store | null
  user: { uid: string } | null
  currentImageIndex: number
  isDescriptionExpanded: boolean
  isLiked: boolean
  onPrevImage: () => void
  onNextImage: () => void
  onToggleDescription: () => void
  onLikeToggle: () => void
}

const ProductInfoSection = memo(function ProductInfoSection({
  product,
  user,
  currentImageIndex,
  isDescriptionExpanded,
  isLiked,
  onPrevImage,
  onNextImage,
  onToggleDescription,
  onLikeToggle
}: ProductInfoSectionProps) {
  const router = useRouter()

  // 할인 기간이 유효한지 체크하는 함수
  const isDiscountValid = () => {
    if (!product.discount || !product.discount.discountPercent || product.discount.discountPercent <= 0) {
      return false
    }

    // 상시 적용이거나 기간이 설정되지 않은 경우
    if (!product.discount.startDate || !product.discount.endDate) {
      return true
    }

    const now = new Date()
    const startDate = new Date(product.discount.startDate)
    const endDate = new Date(product.discount.endDate)

    // 현재 시간이 시작일과 종료일 사이에 있는지 체크
    return now >= startDate && now <= endDate
  }

  return (
    <>
      <div className={styles.productCard}>
        {/* 상품 이미지 */}
        <div className={styles.imageWrapper}>
          {product.images && product.images.length > 0 ? (
            <>
              <OptimizedImage
                src={product.images[currentImageIndex]}
                alt={product.name}
                fill
                className={styles.productImage}
                style={{ objectFit: 'cover' }}
              />
              {product.images.length > 1 && (
                <>
                  <button
                    className={styles.prevButton}
                    onClick={onPrevImage}
                    aria-label="이전 이미지"
                  >
                    ‹
                  </button>
                  <button
                    className={styles.nextButton}
                    onClick={onNextImage}
                    aria-label="다음 이미지"
                  >
                    ›
                  </button>
                  <div className={styles.imageIndicator}>
                    {currentImageIndex + 1} / {product.images.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className={styles.placeholderImage}>
              <span>이미지 없음</span>
            </div>
          )}
        </div>

        <div className={styles.productInfo}>
          <div className={styles.topRow}>
            <div className={styles.categoryInfo}>
              {product.productTypes && product.productTypes.length > 0 && (
                <div className={styles.productTypesContainer}>
                  {product.productTypes.map((type, index) => (
                    <span key={index} className={styles.productTypeBadge}>
                      {type.replace('상품', '')}
                    </span>
                  ))}
                </div>
              )}
              <h1 className={styles.productName}>{product.name}</h1>
            </div>
            <button
              className={`${styles.likeButton} ${isLiked ? styles.liked : ''}`}
              onClick={onLikeToggle}
            >
              <OptimizedImage
                src={isLiked ? "/icons/heart_active.png" : "/icons/heart.png"}
                alt="좋아요"
                width={24}
                height={24}
              />
            </button>
          </div>

          {/* 별점 및 배송비 정보 */}
          {product.reviewCount !== undefined && (
            <div className={styles.ratingAndDeliveryRow}>
              <div className={styles.ratingInfo}>
                <OptimizedImage
                  src="/icons/star.png"
                  alt="별점"
                  width={16}
                  height={16}
                  className={styles.starIcon}
                />
                <span className={styles.ratingScore}>
                  {product.averageRating?.toFixed(1) || '0.0'}
                </span>
                <span className={styles.reviewCount}>
                  ({product.reviewCount?.toLocaleString() || '0'})
                </span>
              </div>
              {product.deliveryFeeSettings && (
                <div className={styles.deliveryFeeInfo}>
                  <OptimizedImage src="/icons/delivery.svg" alt="배송" width={16} height={16} />
                  {product.deliveryFeeSettings.type === '무료' && '배송비 무료'}
                  {product.deliveryFeeSettings.type === '조건부 무료' &&
                    `${product.deliveryFeeSettings.freeCondition?.toLocaleString()}원 이상 구매 시, 배송비 무료`}
                  {product.deliveryFeeSettings.type === '유료' &&
                    `배송비 ${product.deliveryFeeSettings.baseFee?.toLocaleString()}원`}
                  {product.deliveryFeeSettings.type === '수량별' &&
                    `${product.deliveryFeeSettings.perQuantity}개당, 배송비 ${product.deliveryFeeSettings.baseFee?.toLocaleString()}원`}
                </div>
              )}
            </div>
          )}

          {/* 가격 정보 */}
          {isDiscountValid() && product.discountedPrice ? (
            <div className={styles.priceSection}>
              <span className={styles.originalPrice}>{product.price.toLocaleString()}원</span>
              <span className={styles.discountedPrice}>{product.discountedPrice?.toLocaleString()}원</span>
              <span className={styles.discountPercent}>{product.discount!.discountPercent}%</span>
            </div>
          ) : (
            <span className={styles.regularPrice}>{product.price.toLocaleString()}원</span>
          )}

          {/* 추가 설정 - PC용 */}
          <div className={styles.badgeContainerDesktop}>
            {product.additionalSettings?.map((setting, index) => (
              <span key={index} className={styles.settingBadge}>{setting}</span>
            ))}
          </div>

          {/* 추가 설정 - 모바일용 */}
          <div className={styles.badgeContainerMobile}>
            {product.additionalSettings?.map((setting, index) => (
              <span key={index} className={styles.settingBadge}>{setting}</span>
            ))}
          </div>

          {/* 상품 수량별 예약주문 안내 */}
          {product.quantityRanges && product.quantityRanges.length > 0 && (
            <div className={styles.quantityRangesBox}>
              <div className={styles.quantityRangesTitle}>상품 수량별 예약주문 안내</div>
              <div className={styles.quantityRangesDivider}></div>
              <div className={styles.quantityRangesList}>
                {product.quantityRanges.map((range, index) => (
                  <div key={index} className={styles.quantityRangeItem}>
                    - {range.minQuantity}개 ~ {range.maxQuantity}개 주문 시 {range.daysBeforeOrder === 0 ? '당일배송 가능' : `${range.daysBeforeOrder}일전 주문`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 채팅 및 가게 버튼 */}
          <div className={styles.actionButtons}>
            <button className={styles.actionButton} onClick={() => {
              if (!user) {
                alert('로그인이 필요합니다.')
                return
              }
              // 본인 상품인지 확인
              if (user.uid === product.storeId) {
                alert('자기 자신과의 채팅방 생성 되지 않습니다.')
                return
              }
              router.push(`/chat?productId=${product.id}&message=${encodeURIComponent('이 상품에 대해서 궁금합니다.')}`)
            }}>
              <img src="/icons/product_chat.png" alt="채팅" className={styles.actionIcon} />
              채팅
            </button>
            <button className={styles.actionButton} onClick={() => {
              if (product.storeId) {
                router.push(`/store/${product.storeId}`)
              }
            }}>
              <img src="/icons/product_store.png" alt="가게" className={styles.actionIcon} />
              가게
            </button>
          </div>
        </div>
      </div>

      {/* 상품 상세 설명 */}
      {product.description && (
        <div className={styles.descriptionSection}>
          <h3 className={styles.descriptionSectionTitle}>상품 설명</h3>
          <div
            className={`${styles.descriptionText} ${isDescriptionExpanded ? styles.expanded : ''}`}
            dangerouslySetInnerHTML={{ __html: product.description }}
          />

          {/* 원산지 표기 - 펼쳤을 때만 표시 */}
          {isDescriptionExpanded && product.origin && product.origin.length > 0 && (
            <div className={styles.originSection}>
              <h3 className={styles.originTitle}>원산지 표기</h3>
              <p className={styles.originText}>
                {product.origin.map((item, index) => (
                  <span key={index}>
                    {item.ingredient}({item.origin}){index < product.origin!.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            </div>
          )}

          <button
            className={styles.expandButton}
            onClick={onToggleDescription}
          >
            {isDescriptionExpanded ? '상품 설명 접기' : '상품 설명 펼쳐보기'}
          </button>
        </div>
      )}
    </>
  )
})

export default ProductInfoSection
