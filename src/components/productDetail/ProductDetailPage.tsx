'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc, query, where, getDocs, orderBy, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useProductLike } from '@/hooks/useProductLike'
import Loading from '@/components/Loading'
import ProductInfoSection from './sections/ProductInfoSection'
import ReviewSection from './sections/ReviewSection'
import OptionSelectSection from './sections/OptionSelectSection'
import CartItemsSection from './sections/CartItemsSection'
import BottomModal from './sections/BottomModal'
import { Product, Store, CartItem, Review } from './types'
import styles from './ProductDetailPage.module.css'

interface ProductDetailPageProps {
  productId: string
  storeId: string
}

export type { Product, Store, CartItem, Review }

// Data Fetchers
const maskUserName = (name: string): string => {
  if (name.length > 2) {
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
  } else if (name.length === 2) {
    return name[0] + '*'
  } else {
    return name
  }
}

const fetchProduct = async (productId: string): Promise<Product | null> => {
  try {
    const productDoc = await getDoc(doc(db, 'products', productId))
    if (productDoc.exists()) {
      const productData = {
        id: productDoc.id,
        ...productDoc.data()
      } as Product

      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('productId', '==', productId)
        )
        const reviewsSnapshot = await getDocs(reviewsQuery)
        const reviews = reviewsSnapshot.docs.map(doc => doc.data())

        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0)
          productData.averageRating = totalRating / reviews.length
          productData.reviewCount = reviews.length
        } else {
          productData.averageRating = 0
          productData.reviewCount = 0
        }
      } catch (error) {
        console.error('리뷰 정보 가져오기 실패:', error)
        productData.averageRating = 0
        productData.reviewCount = 0
      }

      return productData
    }
    return null
  } catch (error) {
    console.error('상품 로드 실패:', error)
    return null
  }
}

const fetchStore = async (storeId: string): Promise<Store | null> => {
  try {
    const storeDoc = await getDoc(doc(db, 'stores', storeId))
    if (storeDoc.exists()) {
      return {
        id: storeDoc.id,
        ...storeDoc.data()
      } as Store
    }
    return null
  } catch (error) {
    console.error('가게 로드 실패:', error)
    return null
  }
}

const fetchReviews = async (productId: string): Promise<Review[]> => {
  try {
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    )
    const reviewsSnapshot = await getDocs(reviewsQuery)

    const reviewsData: Review[] = []
    for (const docSnap of reviewsSnapshot.docs) {
      const data = docSnap.data()

      let userName = '익명'
      if (data.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const rawName = userData.name || '익명'
            userName = maskUserName(rawName)
          }
        } catch (error) {
          console.error('사용자 정보 로딩 실패:', error)
        }
      }

      reviewsData.push({
        id: docSnap.id,
        userId: data.uid || data.userId,
        userName,
        rating: data.rating,
        content: data.content,
        images: data.images || [],
        createdAt: data.createdAt?.toDate() || new Date(),
      })
    }

    return reviewsData
  } catch (error) {
    console.error('리뷰 로딩 실패:', error)
    return []
  }
}

export default function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // additionalOrderId 파라미터 가져오기
  const additionalOrderId = searchParams.get('additionalOrderId')

  // 상태 관리만
  const [product, setProduct] = useState<Product | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isEditingOrder, setIsEditingOrder] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalHeight, setModalHeight] = useState(80)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [startHeight, setStartHeight] = useState(80)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null)
  const [storeRequest, setStoreRequest] = useState('')

  const { isLiked, setLikeCount, handleLikeToggle } = useProductLike({
    productId,
    productName: product?.name || '',
    productImage: product?.images?.[0],
    initialLikeCount: 0
  })

  // 데이터 로딩
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productData = await fetchProduct(productId)
        if (productData) {
          setProduct(productData)

          const productDoc = await getDoc(doc(db, 'products', productId))
          if (productDoc.exists()) {
            const data = productDoc.data()
            setLikeCount(data.likeCount || 0)
          }

          const cartItemId = searchParams.get('cartItemId')
          const orderId = searchParams.get('orderId')

          console.log('[ProductDetail] URL 파라미터:', { cartItemId, orderId, hasUser: !!user })

          // 추가 주문 모드에서 주문 수정인 경우
          if (additionalOrderId && user) {
            try {
              console.log('[ProductDetail] additionalOrderId로 주문 데이터 로드 시작:', additionalOrderId)

              // mode 파라미터로 추가(add) vs 수정(edit) 구분
              const mode = searchParams.get('mode')
              const isEditMode = mode === 'edit'

              console.log('[ProductDetail] 추가 주문 모드:', mode, '수정 모드:', isEditMode)

              const orderDocRef = doc(db, 'orders', additionalOrderId)
              const orderDocSnap = await getDoc(orderDocRef)

              if (orderDocSnap.exists()) {
                const orderData = orderDocSnap.data()
                console.log('[ProductDetail] 추가 주문 데이터:', orderData)
                setEditingCartItemId(additionalOrderId)
                setIsEditingOrder(isEditMode)

                // 수정(edit) 모드인 경우 sessionStorage에서 추가 주문 데이터 로드
                if (isEditMode) {
                  const additionalDataStr = sessionStorage.getItem('additionalOrderData')

                  if (additionalDataStr) {
                    try {
                      const additionalData = JSON.parse(additionalDataStr)
                      console.log('[ProductDetail] 수정 모드 - sessionStorage에서 추가 주문 데이터 로드:', additionalData)

                      const convertedItems = additionalData.items.map((item: { options?: Record<string, string>; additionalOptions?: Record<string, string>; quantity: number }) => ({
                        options: item.options || {},
                        additionalOptions: item.additionalOptions,
                        quantity: item.quantity
                      }))
                      console.log('[ProductDetail] 변환된 items:', convertedItems)
                      setCartItems(convertedItems)

                      const firstItem = additionalData.items[0]
                      if (firstItem) {
                        setQuantity(firstItem.quantity)
                      }

                      if (orderData.request) {
                        setStoreRequest(orderData.request)
                      }

                      console.log('[ProductDetail] 추가 주문 모달 열기')
                      setIsModalOpen(true)
                    } catch (error) {
                      console.error('[ProductDetail] sessionStorage 파싱 실패:', error)
                    }
                  } else {
                    console.log('[ProductDetail] sessionStorage에 추가 주문 데이터 없음 - 빈 상태로 시작')
                  }
                } else if (!isEditMode) {
                  // 추가(add) 모드인 경우 빈 상태로 시작 (기존 items 로드하지 않음)
                  console.log('[ProductDetail] 추가 모드 - 빈 상태로 시작')

                  // 필수 옵션이 없는 경우 기본 상품 1개 자동 추가
                  const productDoc = await getDoc(doc(db, 'products', productId))
                  if (productDoc.exists()) {
                    const productData = productDoc.data()
                    if (!productData.optionsEnabled) {
                      console.log('[ProductDetail] 필수 옵션 없음 - 기본 상품 1개 추가')
                      setCartItems([{
                        options: {},
                        additionalOptions: undefined,
                        quantity: 1
                      }])
                      setIsModalOpen(true)
                    }
                  }
                } else {
                  console.error('[ProductDetail] 수정 모드인데 items 배열이 없거나 배열이 아님')
                }
              } else {
                console.error('[ProductDetail] 추가 주문 문서가 존재하지 않음')
              }
            } catch (error) {
              console.error('[ProductDetail] 추가 주문 데이터 로드 실패:', error)
            }
          } else if (cartItemId && user) {
            try {
              const cartDocRef = doc(db, 'shoppingCart', cartItemId)
              const cartDocSnap = await getDoc(cartDocRef)

              if (cartDocSnap.exists()) {
                const cartData = cartDocSnap.data()
                setEditingCartItemId(cartItemId)

                if (cartData.items && Array.isArray(cartData.items)) {
                  const convertedItems = cartData.items.map((item: { options?: Record<string, string>; additionalOptions?: Record<string, string>; quantity: number }) => ({
                    options: item.options || {},
                    additionalOptions: item.additionalOptions,
                    quantity: item.quantity
                  }))
                  setCartItems(convertedItems)

                  const firstItem = cartData.items[0]
                  if (firstItem) {
                    setQuantity(firstItem.quantity)
                  }

                  if (cartData.request) {
                    setStoreRequest(cartData.request)
                  }

                  setIsModalOpen(true)
                }
              }
            } catch (error) {
              console.error('[ProductDetail] 장바구니 데이터 로드 실패:', error)
            }
          } else if (orderId && user) {
            try {
              console.log('[ProductDetail] orderId로 주문 데이터 로드 시작:', orderId)
              const orderDocRef = doc(db, 'orders', orderId)
              const orderDocSnap = await getDoc(orderDocRef)

              if (orderDocSnap.exists()) {
                const orderData = orderDocSnap.data()
                console.log('[ProductDetail] 주문 데이터:', orderData)
                setEditingCartItemId(orderId) // orderId를 저장하여 수정 모드 표시
                setIsEditingOrder(true) // 주문 수정 모드 표시

                if (orderData.items && Array.isArray(orderData.items)) {
                  console.log('[ProductDetail] items 배열:', orderData.items)
                  const convertedItems = orderData.items.map((item: { options?: Record<string, string>; additionalOptions?: Record<string, string>; quantity: number }) => ({
                    options: item.options || {},
                    additionalOptions: item.additionalOptions,
                    quantity: item.quantity
                  }))
                  console.log('[ProductDetail] 변환된 items:', convertedItems)
                  setCartItems(convertedItems)

                  const firstItem = orderData.items[0]
                  if (firstItem) {
                    setQuantity(firstItem.quantity)
                  }

                  if (orderData.request) {
                    setStoreRequest(orderData.request)
                  }

                  console.log('[ProductDetail] 모달 열기')
                  setIsModalOpen(true)
                } else {
                  console.error('[ProductDetail] items 배열이 없거나 배열이 아님')
                }
              } else {
                console.error('[ProductDetail] 주문 문서가 존재하지 않음')
              }
            } catch (error) {
              console.error('[ProductDetail] 주문 데이터 로드 실패:', error)
            }
          } else {
            setQuantity(1)

            // 필수 옵션이 없고 추가 옵션만 있는 경우 기본 상품 1개를 담은 상태로 시작
            if (!productData.optionsEnabled && productData.additionalOptionsEnabled) {
              const defaultItem: CartItem = {
                options: {},
                additionalOptions: undefined,
                quantity: 1
              }
              setCartItems([defaultItem])
            }
            // 필수 옵션도 없고 추가 옵션도 없는 경우 (옵션이 아예 없는 상품)
            else if (!productData.optionsEnabled && !productData.additionalOptionsEnabled) {
              const defaultItem: CartItem = {
                options: {},
                additionalOptions: undefined,
                quantity: 1
              }
              setCartItems([defaultItem])
            }
          }


          if (productData.storeId) {
            const storeData = await fetchStore(productData.storeId)
            if (storeData) {
              setStore(storeData)
            }
          }
        }
      } catch (error) {
        console.error('상품 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId, searchParams, user, setLikeCount])

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const reviewsData = await fetchReviews(productId)
        setReviews(reviewsData)
      } catch (error) {
        console.error('리뷰 로딩 실패:', error)
      } finally {
        setLoadingReviews(false)
      }
    }

    if (productId) {
      loadReviews()
    }
  }, [productId])

  // 장바구니 아이템 수량 변경 핸들러
  const removeFromCart = (index: number) => {
    setCartItems(prev => {
      const newItems = prev.filter((_, i) => i !== index)

      // 모든 아이템이 삭제되고, 필수 옵션이 없는 경우 기본 상품 1개 추가
      if (newItems.length === 0 && product && !product.optionsEnabled) {
        return [{
          options: {},
          additionalOptions: undefined,
          quantity: 1
        }]
      }

      return newItems
    })
  }

  const updateCartQuantity = (index: number, newQuantity: number) => {
    const validQuantity = Math.max(0, newQuantity)
    setCartItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: validQuantity } : item
    ))
  }

  const handleQuantityInputChange = (index: number, value: string) => {
    if (value === '') {
      setCartItems(prev => prev.map((item, i) =>
        i === index ? { ...item, quantity: 0 } : item
      ))
      return
    }

    const numValue = parseInt(value)
    if (!isNaN(numValue)) {
      setCartItems(prev => prev.map((item, i) =>
        i === index ? { ...item, quantity: numValue } : item
      ))
    }
  }

  // 이미지/설명 핸들러
  const handlePrevImage = useCallback(() => {
    if (!product?.images) return
    setCurrentImageIndex((prev) => (prev === 0 ? product.images!.length - 1 : prev - 1))
  }, [product?.images])

  const handleNextImage = useCallback(() => {
    if (!product?.images) return
    setCurrentImageIndex((prev) => (prev === product.images!.length - 1 ? 0 : prev + 1))
  }, [product?.images])

  const handleToggleDescription = useCallback(() => {
    setIsDescriptionExpanded(prev => !prev)
  }, [])

  // 모달 드래그 핸들러
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true)
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setStartY(clientY)
    setStartHeight(modalHeight)
  }

  const handleDragMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging) return

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const deltaY = startY - clientY
    const newHeight = Math.min(90, Math.max(20, startHeight + (deltaY / window.innerHeight) * 100))
    setModalHeight(newHeight)
  }

  const handleDragEnd = () => {
    setIsDragging(false)

    if (modalHeight < 30) {
      setIsModalOpen(false)
      setModalHeight(80)
    } else if (modalHeight < 50) {
      setModalHeight(40)
    } else {
      setModalHeight(80)
    }
  }

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: TouchEvent | MouseEvent) => handleDragMove(e)
      const handleEnd = () => handleDragEnd()

      window.addEventListener('touchmove', handleMove)
      window.addEventListener('touchend', handleEnd)
      window.addEventListener('mousemove', handleMove as EventListener)
      window.addEventListener('mouseup', handleEnd)

      return () => {
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('touchend', handleEnd)
        window.removeEventListener('mousemove', handleMove as EventListener)
        window.removeEventListener('mouseup', handleEnd)
      }
    }
  }, [isDragging, startY, startHeight, modalHeight])

  if (!product && !loading) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>상품을 찾을 수 없습니다.</div>
      </div>
    )
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      {!product ? (
        <div className={styles.error}>상품을 찾을 수 없습니다.</div>
      ) : (
        <>
          <div className={styles.leftSection}>
            <ProductInfoSection
              product={product}
              store={store}
              user={user}
              currentImageIndex={currentImageIndex}
              isDescriptionExpanded={isDescriptionExpanded}
              isLiked={isLiked}
              onPrevImage={handlePrevImage}
              onNextImage={handleNextImage}
              onToggleDescription={handleToggleDescription}
              onLikeToggle={handleLikeToggle}
            />

            <ReviewSection
              reviews={reviews}
              loadingReviews={loadingReviews}
            />
          </div>

          {!isModalOpen && (
            <button
              className={styles.mobileOrderButton}
              onClick={() => setIsModalOpen(true)}
            >
              주문하기
            </button>
          )}

          <BottomModal
            isOpen={isModalOpen}
            modalHeight={modalHeight}
            onClose={() => setIsModalOpen(false)}
            onDragStart={handleDragStart}
          >
            {product && (
              <>
                {(product.optionsEnabled || product.additionalOptionsEnabled) && (
                  <OptionSelectSection
                    product={product}
                    quantity={quantity}
                    cartItems={cartItems}
                    onQuantityChange={setQuantity}
                    onCartItemsChange={setCartItems}
                  />
                )}

                <CartItemsSection
                  user={user}
                  productId={productId}
                  product={product}
                  storeName={store?.storeName || ''}
                  cartItems={cartItems}
                  storeRequest={storeRequest}
                  editingCartItemId={editingCartItemId}
                  isEditingOrder={isEditingOrder}
                  additionalOrderId={additionalOrderId}
                  onRemoveItem={removeFromCart}
                  onUpdateQuantity={updateCartQuantity}
                  onQuantityInputChange={handleQuantityInputChange}
                  onStoreRequestChange={setStoreRequest}
                  onEditingCartItemIdChange={setEditingCartItemId}
                />
              </>
            )}
          </BottomModal>
        </>
      )}
    </div>
  )
}
