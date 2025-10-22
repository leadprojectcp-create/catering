'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Product, Store } from './ProductDetailPage'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: Product
  store: Store | null
  user: { uid: string } | null
  currentImageIndex: number
  isDescriptionExpanded: boolean
  onPrevImage: () => void
  onNextImage: () => void
  onToggleDescription: () => void
}

export default function ProductCard({
  product,
  user,
  currentImageIndex,
  isDescriptionExpanded,
  onPrevImage,
  onNextImage,
  onToggleDescription
}: ProductCardProps) {
  const router = useRouter()

  return (
    <>
      <div className={styles.productCard}>
        {/* 상품 이미지 */}
        <div className={styles.imageWrapper}>
          {product.images && product.images.length > 0 ? (
            <>
              <Image
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

          {/* 가격 정보 */}
          {product.discount && product.discountedPrice && product.discount.discountPercent > 0 ? (
            <div className={styles.priceSection}>
              <span className={styles.originalPrice}>{product.price.toLocaleString()}원</span>
              <span className={styles.discountedPrice}>{product.discountedPrice?.toLocaleString()}원</span>
              <span className={styles.discountPercent}>{product.discount.discountPercent}%</span>
            </div>
          ) : (
            <span className={styles.regularPrice}>{product.price.toLocaleString()}원</span>
          )}

          {/* 주문 가능 수량 */}
          {product.minOrderQuantity && product.maxOrderQuantity && (
            <div className={styles.orderQuantity}>
              주문가능 수량 최소 {product.minOrderQuantity}개 ~ 최대 {product.maxOrderQuantity}개
            </div>
          )}

          {/* 배송 방법 및 추가 설정 - PC용 */}
          <div className={styles.badgeContainerDesktop}>
            <div className={styles.badgeRow}>
              {product.deliveryMethods?.map((method, index) => (
                <span key={index} className={styles.deliveryBadge}>{method}</span>
              ))}
            </div>
            <div className={styles.badgeRow}>
              {product.additionalSettings?.map((setting, index) => (
                <span key={index} className={styles.settingBadge}>{setting}</span>
              ))}
            </div>
          </div>

          {/* 배송 방법 및 추가 설정 - 모바일용 */}
          <div className={styles.badgeContainerMobile}>
            <div className={styles.badgeRow}>
              {product.deliveryMethods?.map((method, index) => (
                <span key={index} className={styles.deliveryBadge}>{method}</span>
              ))}
            </div>
            <div className={styles.badgeRow}>
              {product.additionalSettings?.map((setting, index) => (
                <span key={index} className={styles.settingBadge}>{setting}</span>
              ))}
            </div>
          </div>

          {/* 채팅 및 가게 버튼 */}
          <div className={styles.actionButtons}>
            <button className={styles.actionButton} onClick={() => {
              if (!user) {
                alert('로그인이 필요합니다.')
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

          {/* 원산지 표기 */}
          {product.origin && product.origin.length > 0 && (
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
}
