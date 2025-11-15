'use client'

import { memo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Timestamp } from 'firebase/firestore'
import { Product, Store } from '../types'
import OptimizedImage from '@/components/common/OptimizedImage'
import { calculateDistance, getUserLocation, formatDistance } from '@/lib/utils/distance'
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
  store,
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
  const [distance, setDistance] = useState<number | undefined>(undefined)

  // 거리 계산
  useEffect(() => {
    if (store?.address?.latitude && store?.address?.longitude) {
      // 사용자 위치 가져오기
      const userLocation = getUserLocation()

      if (userLocation) {
        const calculatedDistance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          store.address.latitude,
          store.address.longitude
        )
        setDistance(calculatedDistance)
      }
    }
  }, [store])

  // 할인 기간이 유효한지 체크하는 함수
  const isDiscountValid = () => {
    if (!product.discount || !product.discount.discountPercent || product.discount.discountPercent <= 0) {
      return false
    }

    // 상시 적용이거나 기간이 설정되지 않은 경우
    if (!product.discount.startDate || !product.discount.endDate) {
      return true
    }

    const now = Timestamp.now()
    const startDate = typeof product.discount.startDate === 'string'
      ? Timestamp.fromDate(new Date(product.discount.startDate))
      : product.discount.startDate as unknown as Timestamp
    const endDate = typeof product.discount.endDate === 'string'
      ? Timestamp.fromDate(new Date(product.discount.endDate))
      : product.discount.endDate as unknown as Timestamp

    // 현재 시간이 시작일과 종료일 사이에 있는지 체크
    return now.toMillis() >= startDate.toMillis() && now.toMillis() <= endDate.toMillis()
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
                sizes="(max-width: 768px) 100vw, 600px"
                priority
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
          {/* 첫 번째 줄: 거리 + 별점 (왼쪽) | 좋아요 버튼 (오른쪽) */}
          <div className={styles.topRow}>
            <div className={styles.distanceAndRating}>
              {/* 거리 표시 */}
              {distance !== undefined && (
                <div className={styles.distanceWrapper}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8.00065 1.3335C5.42065 1.3335 3.33398 3.42016 3.33398 6.00016C3.33398 9.50016 8.00065 14.6668 8.00065 14.6668C8.00065 14.6668 12.6673 9.50016 12.6673 6.00016C12.6673 3.42016 10.5807 1.3335 8.00065 1.3335ZM8.00065 7.66683C7.55862 7.66683 7.1347 7.49123 6.82214 7.17867C6.50958 6.86611 6.33398 6.44219 6.33398 6.00016C6.33398 5.55814 6.50958 5.13421 6.82214 4.82165C7.1347 4.50909 7.55862 4.3335 8.00065 4.3335C8.44268 4.3335 8.8666 4.50909 9.17916 4.82165C9.49172 5.13421 9.66732 5.55814 9.66732 6.00016C9.66732 6.44219 9.49172 6.86611 9.17916 7.17867C8.8666 7.49123 8.44268 7.66683 8.00065 7.66683Z" fill="#4E5968"/>
                  </svg>
                  <span className={styles.storeDistance}>
                    내 위치에서 {formatDistance(distance)}
                  </span>
                </div>
              )}

              {/* 별점 */}
              {product.reviewCount !== undefined && (
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
              )}
            </div>

            {/* 좋아요 버튼 */}
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

          {/* 두 번째 줄: 카테고리 정보 + 상품명 */}
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

          {/* 세 번째 줄: 추가 설정 뱃지들 */}
          <div className={styles.badgeContainerDesktop}>
            {product.additionalSettings?.map((setting, index) => (
              <span key={index} className={styles.settingBadge}>{setting}</span>
            ))}
          </div>
          <div className={styles.badgeContainerMobile}>
            {product.additionalSettings?.map((setting, index) => (
              <span key={index} className={styles.settingBadge}>{setting}</span>
            ))}
          </div>

          {/* 네 번째 줄: 배송비 정보 */}
          <div className={styles.deliveryFeeSection}>
            {/* 택배 배송비 */}
            {product.deliveryFeeSettings && (
              <div className={styles.deliveryFeeRow}>
                <OptimizedImage src="/icons/parcel_delivery.png" alt="택배배송" width={16} height={16} />
                <span className={`${styles.deliveryFeeLabel} ${styles.parcel}`}>택배 배송</span>
                <span className={styles.deliveryFeeText}>
                  {product.deliveryFeeSettings.type === '무료' && '배송비 무료'}
                  {product.deliveryFeeSettings.type === '조건부 무료' &&
                    `${product.deliveryFeeSettings.freeCondition?.toLocaleString()}원 이상 구매 시, 배송비 무료`}
                  {product.deliveryFeeSettings.type === '유료' &&
                    `배송비 ${product.deliveryFeeSettings.baseFee?.toLocaleString()}원`}
                  {product.deliveryFeeSettings.type === '수량별' &&
                    `${product.deliveryFeeSettings.perQuantity}개당 ${product.deliveryFeeSettings.baseFee?.toLocaleString()}원`}
                </span>
              </div>
            )}

            {/* 퀵 배송비 */}
            {product.quickDeliveryFeeSettings && (
              <div className={styles.deliveryFeeRow}>
                <OptimizedImage src="/icons/quick_delivery.png" alt="퀵배송" width={16} height={16} />
                <span className={`${styles.deliveryFeeLabel} ${styles.quick}`}>퀵 배송</span>
                <span className={styles.deliveryFeeText}>
                  {product.quickDeliveryFeeSettings.type === '무료' && '배송비 무료'}
                  {product.quickDeliveryFeeSettings.type === '조건부 지원' &&
                    `${product.quickDeliveryFeeSettings.freeCondition?.toLocaleString()}원 이상 구매 시, ${product.quickDeliveryFeeSettings.maxSupport?.toLocaleString()}원 기본 배송비 지원`}
                  {product.quickDeliveryFeeSettings.type === '유료' && '거리에 따라서 비용 차등적용'}
                </span>
              </div>
            )}
          </div>

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

          {/* 채팅 및 판매자 버튼 */}
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
              <img src="/icons/product_store.png" alt="판매자" className={styles.actionIcon} />
              판매자
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
