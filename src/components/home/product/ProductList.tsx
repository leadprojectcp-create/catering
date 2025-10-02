'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import styles from './ProductList.module.css'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  images?: string[]
  storeId: string
  storeName?: string
  category?: string
}

interface ProductListProps {
  storeId: string
}

export default function ProductList({ storeId }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), where('storeId', '==', storeId))
        const querySnapshot = await getDocs(q)
        const productData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product))

        setProducts(productData)
      } catch (error) {
        console.error('상품 데이터 가져오기 실패:', error)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [storeId])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>등록된 상품이 없습니다.</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>상품 목록</h2>
      <div className={styles.productGrid}>
        {products.map((product) => {
          const imageUrl = product.images && product.images.length > 0 ? product.images[0] : ''

          return (
            <div key={product.id} className={styles.card}>
              <div className={styles.imageWrapper}>
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className={styles.image}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className={styles.placeholderImage}>
                    <span>이미지 없음</span>
                  </div>
                )}
              </div>

              <div className={styles.info}>
                <h3 className={styles.productName}>{product.name}</h3>
                {product.description && (
                  <p className={styles.description}>{product.description}</p>
                )}
                <div className={styles.price}>
                  {product.price.toLocaleString()}원
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
