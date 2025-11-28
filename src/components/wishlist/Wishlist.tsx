'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import OptimizedImage from '@/components/common/OptimizedImage'
import Loading from '@/components/Loading'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import styles from './Wishlist.module.css'

interface LikedStore {
  id: string
  storeId: string
  storeName: string
  storeImage?: string
  storeImages?: string[]
  address?: {
    city?: string
    district?: string
  }
  categories?: string[]
  rating?: number
  reviewCount?: number
}

interface LikedProduct {
  id: string
  productId: string
  productName: string
  productImage?: string
  price?: number
  discountedPrice?: number
  discount?: {
    discountAmount: number
    discountPercent: number
  }
  storeName?: string
  minOrderQuantity?: number
  maxOrderQuantity?: number
  minOrderDays?: number
  additionalSettings?: string[]
  averageRating?: number
  productReviewCount?: number
}

interface WishlistData {
  stores: LikedStore[]
  products: LikedProduct[]
}

// SWR fetcher 함수
const fetchWishlistData = async (userId: string): Promise<WishlistData> => {
  const likesQuery = query(
    collection(db, 'likes'),
    where('userId', '==', userId)
  )
  const likesSnapshot = await getDocs(likesQuery)

  const stores: LikedStore[] = []
  const products: LikedProduct[] = []

  // 각 likes 문서를 순회하며 실제 store/product 데이터 가져오기
  await Promise.all(likesSnapshot.docs.map(async (likeDoc) => {
    const data = likeDoc.data()

    if (data.storeId) {
      // store 데이터 가져오기
      const storeDoc = await getDoc(doc(db, 'stores', data.storeId))
      if (storeDoc.exists()) {
        const storeData = storeDoc.data()
        stores.push({
          id: likeDoc.id,
          storeId: data.storeId,
          storeName: storeData.storeName,
          storeImage: data.storeImage,
          storeImages: storeData.storeImages || [],
          address: storeData.address || {},
          categories: storeData.categories || [],
          rating: storeData.rating || 0,
          reviewCount: storeData.reviewCount || 0
        })
      }
    } else if (data.productId) {
      // product 데이터 가져오기
      const productDoc = await getDoc(doc(db, 'products', data.productId))
      if (productDoc.exists()) {
        const productData = productDoc.data()

        // storeName 가져오기
        let storeName = ''
        if (productData.storeId) {
          const storeDoc = await getDoc(doc(db, 'stores', productData.storeId))
          if (storeDoc.exists()) {
            storeName = storeDoc.data().storeName || ''
          }
        }

        // 리뷰 정보 가져오기
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('productId', '==', data.productId)
        )
        const reviewsSnapshot = await getDocs(reviewsQuery)
        const reviews = reviewsSnapshot.docs.map(d => d.data())
        const averageRating = reviews.length > 0
          ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length
          : 0

        products.push({
          id: likeDoc.id,
          productId: data.productId,
          productName: productData.name,
          productImage: data.productImage,
          price: productData.price,
          discountedPrice: productData.discountedPrice,
          discount: productData.discount,
          storeName,
          minOrderQuantity: productData.minOrderQuantity,
          maxOrderQuantity: productData.maxOrderQuantity,
          minOrderDays: productData.minOrderDays,
          additionalSettings: productData.additionalSettings || [],
          averageRating,
          productReviewCount: reviews.length
        })
      }
    }
  }))

  return { stores, products }
}

export default function Wishlist() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'stores' | 'products'>('products')

  // SWR로 찜 목록 데이터 관리
  const { data, error, isLoading } = useSWR<WishlistData>(
    user ? `wishlist-${user.uid}` : null,
    () => fetchWishlistData(user!.uid),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  const likedStores = data?.stores || []
  const likedProducts = data?.products || []

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  if (!user || isLoading) {
    return <Loading />
  }

  const currentItems = activeTab === 'stores' ? likedStores : likedProducts
  const isEmpty = currentItems.length === 0

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>찜 리스트</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'products' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('products')}
        >
          찜한 상품
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'stores' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('stores')}
        >
          찜한 판매자
        </button>
      </div>

{isEmpty ? (
          <div className={styles.emptyState}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <p className={styles.emptyText}>
              {activeTab === 'stores' ? '찜한 판매자가 없습니다' : '찜한 상품이 없습니다'}
            </p>
            <p className={styles.emptySubtext}>
              {activeTab === 'stores' ? '마음에 드는 판매자를 찜해보세요' : '마음에 드는 상품을 찜해보세요'}
            </p>
          </div>
        ) : activeTab === 'stores' ? (
          <div className={styles.storeGrid}>
            {likedStores.map(store => {
              const images = store.storeImages && store.storeImages.length > 0 ? store.storeImages : []
              return (
                <div
                  key={store.id}
                  className={styles.storeCard}
                  onClick={() => router.push(`/store/${store.storeId}`)}
                >
                  <div className={styles.imageSlider}
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.classList.contains('swiper-button-prev') ||
                          target.classList.contains('swiper-button-next') ||
                          target.closest('.swiper-button-prev') ||
                          target.closest('.swiper-button-next')) {
                        e.stopPropagation()
                      }
                    }}
                  >
                    {images.length > 0 ? (
                      <Swiper
                        modules={[Navigation]}
                        slidesPerView={3}
                        spaceBetween={5}
                        navigation
                        className={styles.storeSwiper}
                      >
                        {images.map((image, index) => (
                          <SwiperSlide key={index}>
                            <div className={styles.imageWrapper}>
                              <OptimizedImage
                                src={image}
                                alt={`${store.storeName || '판매자'} 이미지 ${index + 1}`}
                                fill
                                sizes="130px"
                                className={styles.cardImage}
                                style={{ objectFit: 'cover' }}
                                priority={index === 0}
                              />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    ) : (
                      <div className={styles.placeholderImage}>
                        <span>🍽️</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardInfo}>
                    <div className={styles.titleRow}>
                      <h3 className={styles.cardTitle}>{store.storeName}</h3>
                      <span className={styles.district}>
                        {store.address?.city && store.address?.district
                          ? `${store.address.city}/${store.address.district}`
                          : store.address?.city || store.address?.district || ''}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={styles.productGrid}>
            {likedProducts.map(product => (
              <div
                key={product.id}
                className={styles.productCard}
                onClick={() => router.push(`/productDetail/${product.productId}`)}
              >
                <div className={styles.productImageWrapper}>
                  {product.productImage ? (
                    <Image
                      src={product.productImage}
                      alt={product.productName}
                      fill
                      className={styles.image}
                      style={{ objectFit: 'cover' }}
                      sizes="400px"
                    />
                  ) : (
                    <div className={styles.productPlaceholderImage}>
                      <span>이미지 없음</span>
                    </div>
                  )}
                </div>

                <div className={styles.info}>
                  {product.storeName && (
                    <div className={styles.storeName}>
                      {product.storeName}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.5 2L8.5 6L4.5 10" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <h3 className={styles.productName}>{product.productName}</h3>

                  {product.discount && product.discountedPrice && product.discount.discountPercent > 0 ? (
                    <div className={styles.priceSection}>
                      <span className={styles.originalPrice}>{product.price?.toLocaleString()}원</span>
                      <span className={styles.discountedPrice}>{product.discountedPrice.toLocaleString()}원</span>
                      <span className={styles.discountPercent}>{product.discount.discountPercent}%</span>
                    </div>
                  ) : (
                    <span className={styles.regularPrice}>{product.price?.toLocaleString()}원</span>
                  )}

                  {product.minOrderQuantity && product.maxOrderQuantity && (
                    <div className={styles.orderQuantity}>
                      최소 {product.minOrderQuantity}개 ~ 최대 {product.maxOrderQuantity}개 주문가능
                    </div>
                  )}

                  {product.minOrderDays && product.minOrderDays > 0 && (
                    <div className={styles.minOrderDays}>
                      최소 {product.minOrderDays}일 전 주문 가능
                    </div>
                  )}

                  {product.productReviewCount !== undefined && (
                    <div className={styles.rating}>
                      <Image
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
                        ({product.productReviewCount?.toLocaleString() || '0'})
                      </span>
                    </div>
                  )}

                  <div className={styles.badgeContainerDesktop}>
                    {product.additionalSettings?.map((setting, idx) => (
                      <span key={idx} className={styles.settingBadge}>{setting}</span>
                    ))}
                  </div>

                  <div className={styles.badgeContainerMobile}>
                    {product.additionalSettings?.map((setting, idx) => (
                      <span key={idx} className={styles.settingBadge}>{setting}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
