'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './ChatRoom.module.css'

interface ProductMessageCardProps {
  productId: string
}

interface Product {
  name: string
  price: number
  imageUrl?: string
}

export default function ProductMessageCard({ productId }: ProductMessageCardProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    try {
      setLoading(true)
      setError(false)

      console.log('[ProductMessageCard] 상품 ID:', productId)

      const productDoc = await getDoc(doc(db, 'products', productId))

      console.log('[ProductMessageCard] 상품 문서 존재:', productDoc.exists())

      if (productDoc.exists()) {
        const data = productDoc.data()
        console.log('[ProductMessageCard] 상품 데이터:', data)

        // images 배열에서 첫 번째 이미지 가져오기
        const imageUrl = data.images && Array.isArray(data.images) && data.images.length > 0
          ? data.images[0]
          : data.imageUrl // 하위 호환성

        setProduct({
          name: data.name,
          price: data.price,
          imageUrl
        })
      } else {
        console.error('[ProductMessageCard] 상품을 찾을 수 없음:', productId)
        setError(true)
      }
    } catch (err) {
      console.error('[ProductMessageCard] 상품 정보 로드 실패:', err, 'productId:', productId)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR')
  }

  if (loading) {
    return (
      <div className={styles.productMessage}>
        <div className={styles.productLoading}>상품 정보 로딩 중...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className={styles.productMessage}>
        <div className={styles.productError}>상품 정보를 불러올 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className={styles.productMessage}>
      {product.imageUrl && (
        <div className={styles.productImage}>
          <img src={product.imageUrl} alt={product.name} />
        </div>
      )}
      <div className={styles.productInfo}>
        <h4 className={styles.productName}>{product.name}</h4>
        <p className={styles.productPrice}>{formatPrice(product.price)}원</p>
      </div>
    </div>
  )
}
