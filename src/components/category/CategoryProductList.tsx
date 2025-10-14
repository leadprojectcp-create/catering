'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import Loading from '@/components/Loading'
import styles from './CategoryProductList.module.css'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  discountedPrice?: number
  discount?: {
    discountAmount: number
    discountPercent: number
  }
  images?: string[]
  storeId: string
  storeName?: string
  category?: string
  status?: string
  minOrderQuantity?: number
  maxOrderQuantity?: number
  additionalSettings?: string[]
}

interface CategoryProductListProps {
  categoryName: string
}

export default function CategoryProductList({ categoryName }: CategoryProductListProps) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('카테고리:', categoryName)

        let productData: Product[] = []

        // 답례품 카테고리인 경우
        if (categoryName === '답례품') {
          const productsQuery = query(
            collection(db, 'products'),
            where('additionalSettings', 'array-contains', '답례품'),
            where('status', '==', 'active')
          )
          const productsSnapshot = await getDocs(productsQuery)
          console.log('답례품 상품 수:', productsSnapshot.docs.length)

          productData = productsSnapshot.docs.map(docSnap => {
            const data = docSnap.data()
            console.log('상품 데이터:', data)
            return {
              id: docSnap.id,
              ...data
            } as Product
          })
        }
        // 당일배송 카테고리인 경우
        else if (categoryName === '당일배송') {
          const productsQuery = query(
            collection(db, 'products'),
            where('additionalSettings', 'array-contains', '당일배송'),
            where('status', '==', 'active')
          )
          const productsSnapshot = await getDocs(productsQuery)
          console.log('당일배송 상품 수:', productsSnapshot.docs.length)

          productData = productsSnapshot.docs.map(docSnap => {
            const data = docSnap.data()
            return {
              id: docSnap.id,
              ...data
            } as Product
          })
        } else {
          // 일반 카테고리의 경우: products의 category 필드로 직접 조회
          const productsQuery = query(
            collection(db, 'products'),
            where('category', '==', categoryName)
          )
          const productsSnapshot = await getDocs(productsQuery)
          console.log('해당 카테고리 전체 상품 수:', productsSnapshot.docs.length)

          // status가 'active'인 것만 필터링
          productData = productsSnapshot.docs
            .map(docSnap => {
              const data = docSnap.data()
              console.log('상품 데이터:', data)
              return {
                id: docSnap.id,
                ...data
              } as Product
            })
            .filter(product => product.status === 'active')

          console.log('active 상품 수:', productData.length)
        }

        // 각 상품의 storeId로 storeName 가져오기
        const productsWithStoreName = await Promise.all(
          productData.map(async (product) => {
            if (product.storeId && !product.storeName) {
              try {
                const storeDoc = await getDoc(doc(db, 'stores', product.storeId))
                if (storeDoc.exists()) {
                  return {
                    ...product,
                    storeName: storeDoc.data().storeName || storeDoc.data().name
                  }
                }
              } catch (error) {
                console.error('가게 정보 가져오기 실패:', error)
              }
            }
            return product
          })
        )

        setProducts(productsWithStoreName)
      } catch (error) {
        console.error('상품 데이터 가져오기 실패:', error)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [categoryName])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{categoryName}</h2>
      <p className={styles.count}>총 {products.length}개의 상품</p>

      <div className={styles.productGrid}>
        {products.length === 0 ? (
          <div className={styles.emptyState}>
            {categoryName} 카테고리에 등록된 상품이 없습니다.
          </div>
        ) : (
          products.map((product) => {
            const imageUrl = product.images && product.images.length > 0 ? product.images[0] : ''

            return (
              <div
                key={product.id}
                className={styles.card}
                onClick={() => router.push(`/order/${product.id}`)}
              >
                <div className={styles.info}>
                  {product.storeName && (
                    <div className={styles.storeName}>{product.storeName}</div>
                  )}
                  <h3 className={styles.productName}>{product.name}</h3>

                  {/* 가격 정보 */}
                  {product.discount ? (
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
                      주문가능 수량 최소 {product.minOrderQuantity}개 ~ {product.maxOrderQuantity}개
                    </div>
                  )}

                  {/* 추가 설정 - PC용 */}
                  <div className={styles.badgeContainerDesktop}>
                    {product.additionalSettings?.map((setting, idx) => (
                      <span key={idx} className={styles.settingBadge}>{setting}</span>
                    ))}
                  </div>
                </div>

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

                {/* 추가 설정 - 모바일용 */}
                <div className={styles.badgeContainerMobile}>
                  {product.additionalSettings?.map((setting, idx) => (
                    <span key={idx} className={styles.settingBadge}>{setting}</span>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
