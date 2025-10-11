'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './ProductSelectPopup.module.css'

interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  description?: string
}

interface ProductSelectPopupProps {
  storeId: string
  onProductSelect: (product: Product) => void
  onClose: () => void
}

export default function ProductSelectPopup({
  storeId,
  onProductSelect,
  onClose
}: ProductSelectPopupProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [storeId])

  const loadProducts = async () => {
    try {
      setLoading(true)

      // storeId로 상품 목록 가져오기
      const productsRef = collection(db, 'products')
      const q = query(productsRef, where('storeId', '==', storeId))
      const snapshot = await getDocs(q)

      const productList: Product[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        console.log('[ProductSelectPopup] 상품 발견:', {
          id: doc.id,
          name: data.name,
          storeId: data.storeId
        })
        productList.push({
          id: doc.id,
          name: data.name,
          price: data.price,
          imageUrl: data.imageUrl,
          description: data.description
        })
      })

      console.log('[ProductSelectPopup] 총 상품 개수:', productList.length)
      setProducts(productList)
    } catch (error) {
      console.error('상품 목록 로드 실패:', error)
      alert('상품 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleProductClick = (product: Product) => {
    onProductSelect(product)
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR')
  }

  return (
    <>
      {/* 오버레이 */}
      <div className={styles.overlay} onClick={onClose} />

      {/* 팝업 */}
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2 className={styles.title}>상품 선택</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <p>상품 목록을 불러오는 중...</p>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.empty}>
              <p>등록된 상품이 없습니다.</p>
            </div>
          ) : (
            <div className={styles.productList}>
              {products.map((product) => (
                <div
                  key={product.id}
                  className={styles.productItem}
                  onClick={() => handleProductClick(product)}
                >
                  {product.imageUrl && (
                    <div className={styles.productImage}>
                      <img src={product.imageUrl} alt={product.name} />
                    </div>
                  )}
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    {product.description && (
                      <p className={styles.productDescription}>
                        {product.description.length > 50
                          ? `${product.description.substring(0, 50)}...`
                          : product.description}
                      </p>
                    )}
                    <p className={styles.productPrice}>{formatPrice(product.price)}원</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
