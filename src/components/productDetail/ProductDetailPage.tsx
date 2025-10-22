'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import ProductCard from './ProductCard'
import ReviewSection from './ReviewSection'
import OptionSelector from './OptionSelector'
import SelectedItems from './SelectedItems'
import BottomModal from './BottomModal'
import DeliveryMethodSelector from './DeliveryMethodSelector'
import styles from './ProductDetailPage.module.css'
import modalStyles from './BottomModal.module.css'

// Types
export interface Store {
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

export interface Product {
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
  minOrderDays?: number
  deliveryMethods?: string[]
  additionalSettings?: string[]
  origin?: { ingredient: string; origin: string }[]
  storeId: string
  productTypes?: string[]
  options?: {
    groupName: string
    values: { name: string; price: number }[]
  }[]
}

export interface CartItem {
  options: { [key: string]: string }
  quantity: number
}

export interface Review {
  id: string
  userId: string
  userName?: string
  rating: number
  content: string
  images?: string[]
  createdAt: Date
}

interface ProductDetailPageProps {
  productId: string
  storeId: string
}

// Helper Functions
const calculateItemPrice = (
  product: Product | null,
  options: { [key: string]: string },
  qty: number
): number => {
  if (!product) return 0
  const basePrice = product.discountedPrice || product.price
  let optionPrice = 0

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

const calculateTotalPrice = (
  product: Product | null,
  cartItems: CartItem[]
): number => {
  return cartItems.reduce((total, item) => {
    return total + calculateItemPrice(product, item.options, item.quantity)
  }, 0)
}

const createOptionsWithPrices = (
  product: Product,
  options: { [key: string]: string }
): { [key: string]: { name: string; price: number } } => {
  const optionsWithPrices: { [key: string]: { name: string; price: number } } = {}

  Object.entries(options).forEach(([groupName, optionName]) => {
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

  return optionsWithPrices
}

export const getOptionPrice = (
  product: Product,
  groupName: string,
  optionValue: string
): number => {
  let optionPrice = 0
  product.options?.forEach(group => {
    if (group.groupName === groupName) {
      const selected = group.values.find(v => v.name === optionValue)
      if (selected) {
        optionPrice = selected.price
      }
    }
  })
  return optionPrice
}

const maskUserName = (name: string): string => {
  if (name.length > 2) {
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
  } else if (name.length === 2) {
    return name[0] + '*'
  } else {
    return name
  }
}

// Data Fetchers
const fetchProduct = async (productId: string): Promise<Product | null> => {
  try {
    const productDoc = await getDoc(doc(db, 'products', productId))
    if (productDoc.exists()) {
      return {
        id: productDoc.id,
        ...productDoc.data()
      } as Product
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
      try {
        const userDoc = await getDoc(doc(db, 'users', data.userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const rawName = userData.name || '익명'
          userName = maskUserName(rawName)
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

    return reviewsData
  } catch (error) {
    console.error('리뷰 로딩 실패:', error)
    return []
  }
}

export default function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(10)
  const [selectedOptions, setSelectedOptions] = useState<Array<{ groupName: string; optionName: string }>>([])
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
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null)
  const [storeRequest, setStoreRequest] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState('')

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productData = await fetchProduct(productId)
        if (productData) {
          setProduct(productData)

          // 장바구니에서 수정 중인 아이템 데이터 확인
          const editCartItemData = sessionStorage.getItem('editCartItem')
          if (editCartItemData) {
            try {
              const editData = JSON.parse(editCartItemData)
              if (editData.cartItemId) {
                setEditingCartItemId(editData.cartItemId)
              }

              if (editData.items && Array.isArray(editData.items)) {
                setCartItems(editData.items)

                const firstItem = editData.items[0]
                if (firstItem) {
                  setSelectedOptions(firstItem.options)
                  setQuantity(firstItem.quantity)
                }
              }

              sessionStorage.removeItem('editCartItem')
            } catch (error) {
              console.error('장바구니 수정 데이터 로드 실패:', error)
            }
          } else {
            setQuantity(productData.minOrderQuantity || 10)
          }

          // 배송방법 초기화 (첫 번째 배송방법 선택)
          if (productData.deliveryMethods && productData.deliveryMethods.length > 0) {
            setDeliveryMethod(productData.deliveryMethods[0])
          }

          // Fetch store data
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
  }, [productId])

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

  const toggleOption = (groupName: string) => {
    setExpandedOptions(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  const handleOptionSelect = (groupName: string, optionName: string) => {
    setSelectedOptions(prev => {
      // 이미 선택된 옵션인지 확인
      const existingIndex = prev.findIndex(
        opt => opt.groupName === groupName && opt.optionName === optionName
      )

      if (existingIndex !== -1) {
        // 이미 선택되어 있으면 제거 (체크 해제)
        return prev.filter((_, index) => index !== existingIndex)
      } else {
        // 선택되어 있지 않으면 추가 (체크)
        return [...prev, { groupName, optionName }]
      }
    })
  }

  const resetOptions = () => {
    setSelectedOptions([])
    setQuantity(product?.minOrderQuantity || 10)
    setCartItems([])
  }

  const addToCart = () => {
    if (selectedOptions.length === 0) {
      alert('옵션을 선택해주세요.')
      return
    }

    // 선택된 각 옵션을 개별 아이템으로 추가
    selectedOptions.forEach(selectedOption => {
      const optionObj = { [selectedOption.groupName]: selectedOption.optionName }

      // 같은 옵션이 이미 있는지 확인
      const existingIndex = cartItems.findIndex(item =>
        JSON.stringify(item.options) === JSON.stringify(optionObj)
      )

      if (existingIndex !== -1) {
        // 같은 옵션이 있으면 수량만 증가
        setCartItems(prev => prev.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        ))
      } else {
        // 새로운 옵션이면 추가 (초기 수량 1개)
        setCartItems(prev => [...prev, {
          options: optionObj,
          quantity: 1
        }])
      }
    })

    setSelectedOptions([])
  }

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateCartQuantity = (index: number, newQuantity: number) => {
    // 개별 아이템은 1개부터 가능
    const validQuantity = Math.max(1, newQuantity)

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
      const items = cartItems.map(item => ({
        options: item.options,
        quantity: item.quantity
      }))

      const totalPrice = calculateTotalPrice(product, cartItems)

      if (editingCartItemId) {
        const cartDocRef = doc(db, 'shoppingCart', editingCartItemId)

        await updateDoc(cartDocRef, {
          items: items,
          totalPrice: totalPrice
        })

        alert('장바구니가 수정되었습니다.')
        setEditingCartItemId(null)
      } else {
        await addDoc(collection(db, 'shoppingCart'), {
          uid: user.uid,
          storeId: product.storeId,
          productId: productId,
          productName: product.name,
          productPrice: product.discountedPrice || product.price,
          productImage: product.images?.[0] || '',
          items: items,
          totalPrice: totalPrice,
          createdAt: new Date()
        })

        alert('장바구니에 추가되었습니다.')
      }

      router.push('/cart')
    } catch (error) {
      console.error('장바구니 저장 실패:', error)
      alert('장바구니 저장에 실패했습니다.')
    }
  }

  const handleOrder = async () => {
    if (!product || cartItems.length === 0) {
      alert('상품을 선택해주세요.')
      return
    }

    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    if (!deliveryMethod) {
      alert('배송방법을 선택해주세요.')
      return
    }

    // 전체 주문 수량 검증
    const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0)
    const minQty = product.minOrderQuantity || 1
    const maxQty = product.maxOrderQuantity || 999

    if (totalQuantity < minQty) {
      alert(`최소 주문 수량은 ${minQty}개입니다. (현재: ${totalQuantity}개)`)
      return
    }

    if (totalQuantity > maxQty) {
      alert(`최대 주문 수량은 ${maxQty}개입니다. (현재: ${totalQuantity}개)`)
      return
    }

    try {
      const totalPrice = calculateTotalPrice(product, cartItems)

      // Firestore에 저장할 주문 항목 데이터
      const orderItems = cartItems.map(item => {
        const optionsWithPrices = createOptionsWithPrices(product, item.options)

        return {
          productId: productId,
          productName: product.name,
          price: product.discountedPrice || product.price,
          quantity: item.quantity,
          options: item.options,
          optionsWithPrices: optionsWithPrices,
          itemPrice: calculateItemPrice(product, item.options, item.quantity)
        }
      })

      // shoppingCart 컬렉션에 저장 (orders가 아닌 shoppingCart에 저장)
      const cartDoc = await addDoc(collection(db, 'shoppingCart'), {
        uid: user.uid,
        productId: productId,
        storeId: product.storeId,
        storeName: store?.storeName || '',
        items: orderItems,
        totalProductPrice: totalPrice,
        totalQuantity: totalQuantity,
        deliveryMethod: deliveryMethod,
        request: storeRequest,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // payments 페이지로 이동 (cartId를 전달)
      router.push(`/payments?cartId=${cartDoc.id}`)
    } catch (error) {
      console.error('장바구니 저장 실패:', error)
      alert('장바구니 저장에 실패했습니다.')
    }
  }

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

  const getItemPrice = (options: { [key: string]: string }, qty: number) => {
    return calculateItemPrice(product, options, qty)
  }

  const getTotalPrice = () => {
    return calculateTotalPrice(product, cartItems)
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
          <div className={styles.leftSection}>
            <ProductCard
              product={product}
              store={store}
              user={user}
              currentImageIndex={currentImageIndex}
              isDescriptionExpanded={isDescriptionExpanded}
              onPrevImage={handlePrevImage}
              onNextImage={handleNextImage}
              onToggleDescription={handleToggleDescription}
            />

            <ReviewSection
              reviews={reviews}
              loadingReviews={loadingReviews}
            />
          </div>

          {/* 모바일 주문하기 버튼 */}
          {!isModalOpen && (
            <button
              className={styles.mobileOrderButton}
              onClick={() => setIsModalOpen(true)}
            >
              주문하기
            </button>
          )}

          {/* 오른쪽 영역 - 상품 옵션 */}
          {product.options && product.options.length > 0 && (
            <BottomModal
              isOpen={isModalOpen}
              modalHeight={modalHeight}
              onClose={() => setIsModalOpen(false)}
              onDragStart={handleDragStart}
            >
              <OptionSelector
                product={product}
                expandedOptions={expandedOptions}
                selectedOptions={selectedOptions}
                onToggleOption={toggleOption}
                onSelectOption={handleOptionSelect}
                onReset={resetOptions}
                onAddToCart={addToCart}
              />

              {cartItems.length > 0 && (
                <>
                  <DeliveryMethodSelector
                    deliveryMethods={product.deliveryMethods}
                    selectedMethod={deliveryMethod}
                    onMethodChange={setDeliveryMethod}
                  />

                  <SelectedItems
                    product={product}
                    cartItems={cartItems}
                    storeRequest={storeRequest}
                    onRemoveItem={removeFromCart}
                    onUpdateQuantity={updateCartQuantity}
                    onQuantityInputChange={handleQuantityInputChange}
                    onStoreRequestChange={setStoreRequest}
                    onSaveToCart={saveToShoppingCart}
                    onOrder={handleOrder}
                    calculateItemPrice={getItemPrice}
                    calculateTotalPrice={getTotalPrice}
                  />
                </>
              )}
            </BottomModal>
          )}
        </>
      )}
    </div>
  )
}
