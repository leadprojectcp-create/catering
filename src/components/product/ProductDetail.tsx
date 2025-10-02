'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './ProductDetail.module.css'

interface Product {
  id: string
  name: string
  description: string
  price: number
  images: string[]
  category: string
  storeId: string
  storeName: string
  rating?: number
  reviewCount?: number
  options?: {
    name: string
    price: number
  }[]
}

interface ProductDetailProps {
  productId: string
}

export default function ProductDetail({ productId }: ProductDetailProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productDoc = await getDoc(doc(db, 'products', productId))

        if (productDoc.exists()) {
          setProduct({
            id: productDoc.id,
            ...productDoc.data()
          } as Product)
        }
      } catch (error) {
        console.error('상품 정보 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta))
  }

  const handleOrder = () => {
    // 주문 로직 구현
    console.log('주문:', { productId, quantity })
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>상품을 찾을 수 없습니다.</div>
      </div>
    )
  }

  const images = product.images && product.images.length > 0 ? product.images : []

  return (
    <div className={styles.container}>
      {/* 이미지 슬라이더 */}
      <div className={styles.imageSection}>
        {images.length > 0 ? (
          <>
            <div className={styles.mainImage}>
              <Image
                src={images[currentImageIndex]}
                alt={product.name}
                fill
                className={styles.image}
                style={{ objectFit: 'cover' }}
              />
            </div>

            {images.length > 1 && (
              <>
                <button
                  className={`${styles.arrowButton} ${styles.arrowLeft}`}
                  onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                >
                  ‹
                </button>
                <button
                  className={`${styles.arrowButton} ${styles.arrowRight}`}
                  onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                >
                  ›
                </button>

                <div className={styles.indicators}>
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className={`${styles.indicator} ${index === currentImageIndex ? styles.indicatorActive : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
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

      {/* 상품 정보 */}
      <div className={styles.infoSection}>
        <div className={styles.header}>
          <h1 className={styles.productName}>{product.name}</h1>
          <div className={styles.rating}>
            <span className={styles.star}>⭐</span>
            <span className={styles.ratingNumber}>
              {product.rating ? product.rating.toFixed(1) : '0.0'}
            </span>
            <span className={styles.reviewCount}>
              ({product.reviewCount || 0})
            </span>
          </div>
        </div>

        <div className={styles.storeName}>{product.storeName}</div>

        <div className={styles.price}>
          {product.price.toLocaleString()}원
        </div>

        <div className={styles.description}>
          {product.description}
        </div>

        {/* 수량 선택 */}
        <div className={styles.quantitySection}>
          <span className={styles.quantityLabel}>수량</span>
          <div className={styles.quantityControl}>
            <button
              className={styles.quantityButton}
              onClick={() => handleQuantityChange(-1)}
            >
              -
            </button>
            <span className={styles.quantityValue}>{quantity}</span>
            <button
              className={styles.quantityButton}
              onClick={() => handleQuantityChange(1)}
            >
              +
            </button>
          </div>
        </div>

        {/* 총 금액 */}
        <div className={styles.totalPrice}>
          <span className={styles.totalLabel}>총 금액</span>
          <span className={styles.totalAmount}>
            {(product.price * quantity).toLocaleString()}원
          </span>
        </div>

        {/* 주문 버튼 */}
        <div className={styles.actions}>
          <button className={styles.orderButton} onClick={handleOrder}>
            주문하기
          </button>
        </div>
      </div>
    </div>
  )
}
