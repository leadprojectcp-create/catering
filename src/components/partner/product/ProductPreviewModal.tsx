'use client'

import { useState } from 'react'
import ProductInfoSection from '@/components/productDetail/sections/ProductInfoSection'
import { Product as OrderProduct } from '@/components/productDetail/ProductDetailPage'
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
  productTypes?: string[]
}

interface ProductPreviewModalProps {
  product: Product
  onClose: () => void
}

export default function ProductPreviewModal({ product, onClose }: ProductPreviewModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const handlePrevImage = () => {
    setCurrentImageIndex(prev =>
      prev === 0 ? (product.images?.length || 1) - 1 : prev - 1
    )
  }

  const handleNextImage = () => {
    setCurrentImageIndex(prev =>
      prev === (product.images?.length || 1) - 1 ? 0 : prev + 1
    )
  }

  const handleToggleDescription = () => {
    setIsDescriptionExpanded(prev => !prev)
  }

  const handleLikeToggle = () => {
    // Preview modal doesn't have like functionality
  }

  // ProductCard에 맞는 형식으로 변환
  // 할인이 실제로 적용되어 있는지 확인
  const hasValidDiscount = product.discountedPrice && product.discount && product.discount.discountPercent > 0

  const orderProduct: OrderProduct = {
    ...product,
    storeId: '',
    status: 'active',
    // 할인이 없으면 discount와 discountedPrice를 undefined로 설정
    discount: hasValidDiscount ? product.discount : undefined,
    discountedPrice: hasValidDiscount ? product.discountedPrice : undefined
  } as OrderProduct

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* 닫기 버튼 영역 */}
        <div className={styles.closeButtonWrapper}>
          <h2 className={styles.modalTitle}>상품 미리보기</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        {/* ProductInfoSection 컴포넌트 사용 */}
        <div className={styles.productCardWrapper}>
          <ProductInfoSection
            product={orderProduct}
            store={null}
            user={null}
            currentImageIndex={currentImageIndex}
            isDescriptionExpanded={isDescriptionExpanded}
            isLiked={false}
            onPrevImage={handlePrevImage}
            onNextImage={handleNextImage}
            onToggleDescription={handleToggleDescription}
            onLikeToggle={handleLikeToggle}
          />
        </div>
      </div>
    </div>
  )
}
