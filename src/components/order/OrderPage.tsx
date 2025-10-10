'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import styles from './OrderPage.module.css'

interface Store {
  id: string
  storeName: string
  address?: {
    city?: string
    district?: string
    dong?: string
    fullAddress?: string
    detail?: string
  }
  phone?: string
  description?: string
  storeImages?: string[]
  primaryCategory?: string
  categories?: string[]
}

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
  storeId: string
  options?: {
    groupName: string
    values: { name: string; price: number }[]
  }[]
}

interface OrderPageProps {
  productId: string
  storeId: string
}

interface CartItem {
  options: { [key: string]: string }
  quantity: number
}

interface Review {
  id: string
  userId: string
  userName?: string
  rating: number
  content: string
  images?: string[]
  createdAt: Date
}

export default function OrderPage({ productId, storeId }: OrderPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(10)
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({})
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [expandedOptions, setExpandedOptions] = useState<{ [key: string]: boolean }>({})
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalHeight, setModalHeight] = useState(80)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [startHeight, setStartHeight] = useState(80)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const productDoc = await getDoc(doc(db, 'products', productId))
        if (productDoc.exists()) {
          const productData = {
            id: productDoc.id,
            ...productDoc.data()
          } as Product
          setProduct(productData)
          setQuantity(productData.minOrderQuantity || 10)

          // Fetch store data
          if (productData.storeId) {
            const storeDoc = await getDoc(doc(db, 'stores', productData.storeId))
            if (storeDoc.exists()) {
              setStore({
                id: storeDoc.id,
                ...storeDoc.data()
              } as Store)
            }
          }
        }
      } catch (error) {
        console.error('상품 로드 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        console.log('리뷰 쿼리 시작, productId:', productId)
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('productId', '==', productId),
          orderBy('createdAt', 'desc')
        )
        console.log('리뷰 쿼리 실행 중...')
        const reviewsSnapshot = await getDocs(reviewsQuery)
        console.log('리뷰 개수:', reviewsSnapshot.docs.length)

        const reviewsData: Review[] = []
        for (const docSnap of reviewsSnapshot.docs) {
          const data = docSnap.data()

          // 사용자 정보 가져오기
          let userName = '익명'
          try {
            const userDoc = await getDoc(doc(db, 'users', data.userId))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              const rawName = userData.name || '익명'

              // 이름 마스킹 처리 (첫 글자와 마지막 글자만 표시)
              if (rawName.length > 2) {
                userName = rawName[0] + '*'.repeat(rawName.length - 2) + rawName[rawName.length - 1]
              } else if (rawName.length === 2) {
                userName = rawName[0] + '*'
              } else {
                userName = rawName
              }
            }
          } catch (error) {
            console.error('사용자 정보 로딩 실패:', error)
          }

          reviewsData.push({
            id: docSnap.id,
            userId: data.userId,
            userName,
            rating: data.rating,
            content: data.content,
            images: data.images || [],
            createdAt: data.createdAt?.toDate() || new Date(),
          })
        }

        setReviews(reviewsData)
      } catch (error) {
        console.error('리뷰 로딩 실패:', error)
      } finally {
        setLoadingReviews(false)
      }
    }

    if (productId) {
      fetchReviews()
    }
  }, [productId])

  const toggleOption = (groupName: string) => {
    setExpandedOptions(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  const handleOptionSelect = (groupName: string, optionName: string) => {
    setSelectedOptions(prev => {
      // 이미 선택된 옵션을 다시 클릭하면 해제
      if (prev[groupName] === optionName) {
        const newOptions = { ...prev }
        delete newOptions[groupName]
        return newOptions
      }
      return {
        ...prev,
        [groupName]: optionName
      }
    })
  }

  const resetOptions = () => {
    setSelectedOptions({})
    setQuantity(product?.minOrderQuantity || 10)
    setCartItems([])
  }

  const addToCart = () => {
    if (Object.keys(selectedOptions).length === 0) return

    setCartItems(prev => [...prev, {
      options: { ...selectedOptions },
      quantity: product?.minOrderQuantity || 10
    }])

    // 옵션 초기화
    setSelectedOptions({})
  }

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateCartQuantity = (index: number, newQuantity: number) => {
    const minQty = product?.minOrderQuantity || 1
    const maxQty = product?.maxOrderQuantity || 999
    const validQuantity = Math.min(maxQty, Math.max(minQty, newQuantity))

    setCartItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: validQuantity } : item
    ))
  }

  const handleQuantityInputChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0
    updateCartQuantity(index, numValue)
  }

  const saveToShoppingCart = async () => {
    if (!product || cartItems.length === 0) return

    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    try {
      for (const item of cartItems) {
        await addDoc(collection(db, 'shoppingCart'), {
          uid: user.uid,
          storeId: product.storeId,
          productId: productId,
          productName: product.name,
          productPrice: product.discountedPrice || product.price,
          productImage: product.images?.[0] || '',
          options: item.options,
          quantity: item.quantity,
          createdAt: new Date()
        })
      }
      alert('장바구니에 추가되었습니다.')
      router.push('/shopping-cart')
    } catch (error) {
      console.error('장바구니 저장 실패:', error)
      alert('장바구니 추가에 실패했습니다.')
    }
  }

  const handleOrder = () => {
    if (!product || cartItems.length === 0) return

    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    // 각 아이템의 옵션별 가격 정보를 포함하여 주문 데이터 생성
    const itemsWithPrices = cartItems.map(item => {
      const optionsWithPrices: { [key: string]: { name: string; price: number } } = {}

      Object.entries(item.options).forEach(([groupName, optionName]) => {
        product.options?.forEach(group => {
          if (group.groupName === groupName) {
            const selected = group.values.find(v => v.name === optionName)
            if (selected) {
              optionsWithPrices[groupName] = {
                name: selected.name,
                price: selected.price
              }
            }
          }
        })
      })

      return {
        options: item.options,
        optionsWithPrices,
        quantity: item.quantity,
        itemPrice: calculateItemPrice(item.options, item.quantity)
      }
    })

    // 주문 데이터를 세션 스토리지에 저장
    const orderData = {
      storeId: product.storeId,
      storeName: store?.storeName || '',
      productId: productId,
      productName: product.name,
      productPrice: product.discountedPrice || product.price,
      productImage: product.images?.[0] || '',
      items: itemsWithPrices,
      totalPrice: calculateTotalPrice()
    }

    sessionStorage.setItem('orderData', JSON.stringify(orderData))
    router.push('/payments')
  }

  const handlePrevImage = () => {
    if (!product?.images) return
    setCurrentImageIndex((prev) => (prev === 0 ? product.images!.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    if (!product?.images) return
    setCurrentImageIndex((prev) => (prev === product.images!.length - 1 ? 0 : prev + 1))
  }

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

    // 20% 이하로 내리면 모달 닫기
    if (modalHeight < 30) {
      setIsModalOpen(false)
      setModalHeight(80)
    } else if (modalHeight < 50) {
      setModalHeight(40) // 중간 높이로 스냅
    } else {
      setModalHeight(80) // 기본 높이로 스냅
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

  const calculateItemPrice = (options: { [key: string]: string }, qty: number) => {
    if (!product) return 0
    const basePrice = product.discountedPrice || product.price
    let optionPrice = 0

    // 옵션 가격 계산
    Object.values(options).forEach(optionValue => {
      product.options?.forEach(group => {
        const selected = group.values.find(v => v.name === optionValue)
        if (selected) {
          optionPrice += selected.price
        }
      })
    })

    return (basePrice + optionPrice) * qty
  }

  const calculateTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      return total + calculateItemPrice(item.options, item.quantity)
    }, 0)
  }

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
        {/* 왼쪽 영역 */}
        <div className={styles.leftSection}>
          {/* 상품 정보 카드 */}
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
                        onClick={handlePrevImage}
                        aria-label="이전 이미지"
                      >
                        ‹
                      </button>
                      <button
                        className={styles.nextButton}
                        onClick={handleNextImage}
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
              <h1 className={styles.productName}>{product.name}</h1>

              {/* 가격 정보 */}
              {product.discount ? (
                <>
                  <span className={styles.originalPrice}>{product.price.toLocaleString()}원</span>
                  <div className={styles.discountRow}>
                    <span className={styles.discountedPrice}>{product.discountedPrice?.toLocaleString()}원</span>
                    <span className={styles.discountPercent}>{product.discount.discountPercent}%</span>
                  </div>
                </>
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
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? '상품 설명 접기' : '상품 설명 펼쳐보기'}
              </button>
            </div>
          )}

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

          {/* 리뷰 섹션 */}
          <div className={styles.reviewSection}>
            <h3 className={styles.reviewTitle}>리뷰 ({reviews.length})</h3>
            {loadingReviews ? (
              <div className={styles.reviewLoading}>리뷰를 불러오는 중...</div>
            ) : reviews.length === 0 ? (
              <div className={styles.reviewEmpty}>아직 작성된 리뷰가 없습니다.</div>
            ) : (
              <div className={styles.reviewList}>
                {reviews.map((review) => (
                  <div key={review.id} className={styles.reviewItem}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewUser}>
                        <span className={styles.reviewUserName}>{review.userName}</span>
                        <div className={styles.reviewRating}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={star <= review.rating ? styles.starFilled : styles.starEmpty}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className={styles.reviewDate}>
                        {review.createdAt.toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <p className={styles.reviewContent}>{review.content}</p>
                    {review.images && review.images.length > 0 && (
                      <div className={styles.reviewImages}>
                        {review.images.map((imageUrl, index) => (
                          <div key={index} className={styles.reviewImageItem}>
                            <Image
                              src={imageUrl}
                              alt={`리뷰 이미지 ${index + 1}`}
                              width={100}
                              height={100}
                              className={styles.reviewImage}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 모바일 옵션 선택 버튼 */}
          <button
            className={styles.mobileOptionButton}
            onClick={() => setIsModalOpen(true)}
          >
            옵션 선택
          </button>
        </div>

        {/* 오른쪽 영역 - 상품 옵션 */}
        {product.options && product.options.length > 0 && (
          <>
            {/* 모달 오버레이 */}
            {isModalOpen && (
              <div
                className={styles.modalOverlay}
                onClick={() => setIsModalOpen(false)}
              />
            )}

            <div
              className={`${styles.rightSection} ${isModalOpen ? styles.modalOpen : ''}`}
              style={{ maxHeight: `${modalHeight}vh` }}
            >
              {/* 드래그 핸들 */}
              <div
                className={styles.dragHandle}
                onTouchStart={handleDragStart}
                onMouseDown={handleDragStart}
              >
                <div className={styles.dragBar}></div>
              </div>

            <div className={styles.optionSection}>
              <h2 className={styles.optionSectionTitle}>상품 옵션</h2>

              {product.options.map((option, index) => {
                const isExpanded = expandedOptions[option.groupName]

                return (
                  <div key={index} className={isExpanded ? styles.optionGroupExpanded : styles.optionGroup}>
                    <div
                      className={styles.optionHeader}
                      onClick={() => toggleOption(option.groupName)}
                    >
                      <span>{option.groupName}</span>
                      <Image
                        src={isExpanded ? '/icons/chevron-up.svg' : '/icons/chevron-down.svg'}
                        alt={isExpanded ? '접기' : '펼치기'}
                        width={24}
                        height={24}
                      />
                    </div>

                    {isExpanded && (
                      <div className={styles.optionList}>
                        {option.values.map((value, valueIndex) => (
                          <div
                            key={valueIndex}
                            className={styles.optionItem}
                            onClick={() => handleOptionSelect(option.groupName, value.name)}
                          >
                            <Image
                              src={selectedOptions[option.groupName] === value.name ? '/icons/check_active.png' : '/icons/check_empty.png'}
                              alt="checkbox"
                              width={20}
                              height={20}
                            />
                            <span>{value.name}</span>
                            <span className={styles.optionPrice}>
                              + {value.price.toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 초기화 및 담기 버튼 */}
              <div className={styles.selectionButtonGroup}>
                <button className={styles.resetButton} onClick={resetOptions}>
                  <Image
                    src="/icons/reset.svg"
                    alt="초기화"
                    width={24}
                    height={24}
                  />
                  초기화
                </button>
                <button className={styles.addToCartButton} onClick={addToCart}>
                  담기
                </button>
              </div>
            </div>

            {/* 장바구니 */}
            {cartItems.length > 0 && (
              <div className={styles.selectedSection}>
                <div className={styles.selectedItem}>
                  <h3 className={styles.selectedTitle}>선택된 상품</h3>
                  {cartItems.map((item, index) => (
                    <div key={index} className={styles.cartItemWrapper}>
                      <div className={styles.selectedHeader}>
                        <div className={styles.selectedName}>{product.name}</div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className={styles.removeButton}
                        >
                          <Image
                            src="/icons/trash.svg"
                            alt="삭제"
                            width={16}
                            height={16}
                          />
                        </button>
                      </div>
                      {Object.entries(item.options).map(([groupName, optionValue]) => {
                        // 옵션 가격 계산
                        let optionPrice = 0
                        product.options?.forEach(group => {
                          if (group.groupName === groupName) {
                            const selected = group.values.find(v => v.name === optionValue)
                            if (selected) {
                              optionPrice = selected.price
                            }
                          }
                        })

                        return (
                          <div key={groupName} className={styles.selectedOption}>
                            <div>
                              <span className={styles.optionGroupName}>[{groupName}]</span>
                              <span>{optionValue}</span>
                            </div>
                            <span className={styles.optionPrice}>+{optionPrice.toLocaleString()}원</span>
                          </div>
                        )
                      })}
                      <div className={styles.quantityControl}>
                        <button
                          onClick={() => updateCartQuantity(index, item.quantity - 1)}
                          className={styles.quantityButton}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityInputChange(index, e.target.value)}
                          className={styles.quantityValue}
                          min={product.minOrderQuantity || 1}
                          max={product.maxOrderQuantity || 999}
                        />
                        <button
                          onClick={() => updateCartQuantity(index, item.quantity + 1)}
                          className={styles.quantityButton}
                        >
                          +
                        </button>
                      </div>
                      <div className={styles.itemPrice}>
                        {calculateItemPrice(item.options, item.quantity).toLocaleString()}원
                      </div>
                    </div>
                  ))}
                </div>

                {/* 결제 정보 */}
                <div className={styles.paymentSection}>
                  <h3 className={styles.paymentTitle}>결제 정보</h3>
                  <div className={styles.paymentRow}>
                    <span>총 주문 개수</span>
                    <span>{cartItems.reduce((total, item) => total + item.quantity, 0)}개</span>
                  </div>
                  <div className={styles.paymentTotal}>
                    <span>총 결제금액</span>
                    <span className={styles.totalPrice}>{calculateTotalPrice().toLocaleString()}원</span>
                  </div>
                  <div className={styles.buttonGroup}>
                    <button className={styles.cartButton} onClick={saveToShoppingCart}>
                      장바구니
                    </button>
                    <button className={styles.orderButton} onClick={handleOrder}>
                      주문하기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
        )}
        </>
      )}
    </div>
  )
}
