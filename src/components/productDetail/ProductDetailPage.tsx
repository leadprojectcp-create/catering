'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useProductLike } from '@/hooks/useProductLike'
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
  averageRating?: number
  reviewCount?: number
  optionsEnabled?: boolean
  options?: {
    groupName: string
    values: { name: string; price: number }[]
    isRequired?: boolean
  }[]
  additionalOptionsEnabled?: boolean
  additionalOptions?: {
    groupName: string
    values: { name: string; price: number }[]
  }[]
  deliveryFeeSettings?: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    paymentMethods?: ('선결제' | '착불')[]
    perQuantity?: number
  }
}

export interface CartItem {
  options: { [key: string]: string }
  additionalOptions?: { [key: string]: string }
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
  qty: number,
  additionalOptions?: { [key: string]: string }
): number => {
  if (!product) return 0
  const basePrice = product.discountedPrice || product.price
  let optionPrice = 0

  Object.entries(options).forEach(([groupName, optionValue]) => {
    // 쉼표로 구분된 여러 옵션이 있을 수 있으므로 split
    const optionNames = optionValue.split(',').map(name => name.trim())

    optionNames.forEach(optionName => {
      product.options?.forEach(group => {
        if (group.groupName === groupName) {
          const selected = group.values.find(v => v.name === optionName)
          if (selected) {
            optionPrice += selected.price
          }
        }
      })
    })
  })

  // 추가상품 옵션 가격 계산
  if (additionalOptions) {
    Object.entries(additionalOptions).forEach(([groupName, optionValue]) => {
      const optionNames = optionValue.split(',').map(name => name.trim())

      optionNames.forEach(optionName => {
        product.additionalOptions?.forEach(group => {
          if (group.groupName === groupName) {
            const selected = group.values.find(v => v.name === optionName)
            if (selected) {
              optionPrice += selected.price
            }
          }
        })
      })
    })
  }

  return (basePrice + optionPrice) * qty
}

const calculateTotalPrice = (
  product: Product | null,
  cartItems: CartItem[]
): number => {
  return cartItems.reduce((total, item) => {
    return total + calculateItemPrice(product, item.options, item.quantity, item.additionalOptions)
  }, 0)
}

const createOptionsWithPrices = (
  product: Product,
  options: { [key: string]: string }
): { [key: string]: { name: string; price: number } } => {
  const optionsWithPrices: { [key: string]: { name: string; price: number } } = {}

  Object.entries(options).forEach(([groupName, optionValue]) => {
    // 쉼표로 구분된 여러 옵션이 있을 수 있으므로 split
    const optionNames = optionValue.split(',').map(name => name.trim())
    let totalPrice = 0

    optionNames.forEach(optionName => {
      product.options?.forEach(group => {
        if (group.groupName === groupName) {
          const selected = group.values.find(v => v.name === optionName)
          if (selected) {
            totalPrice += selected.price
          }
        }
      })
    })

    // 여러 옵션이면 쉼표로 구분된 이름 그대로 저장, 총 가격 합산
    optionsWithPrices[groupName] = {
      name: optionValue, // 쉼표로 구분된 전체 옵션명
      price: totalPrice
    }
  })

  return optionsWithPrices
}

export const createAdditionalOptionsWithPrices = (
  product: Product,
  additionalOptions: { [key: string]: string }
): { [key: string]: { name: string; price: number } } => {
  const additionalOptionsWithPrices: { [key: string]: { name: string; price: number } } = {}

  Object.entries(additionalOptions).forEach(([groupName, optionValue]) => {
    // 쉼표로 구분된 여러 옵션이 있을 수 있으므로 split
    const optionNames = optionValue.split(',').map(name => name.trim())
    let totalPrice = 0

    optionNames.forEach(optionName => {
      product.additionalOptions?.forEach(group => {
        if (group.groupName === groupName) {
          const selected = group.values.find(v => v.name === optionName)
          if (selected) {
            totalPrice += selected.price
          }
        }
      })
    })

    // 여러 옵션이면 쉼표로 구분된 이름 그대로 저장, 총 가격 합산
    additionalOptionsWithPrices[groupName] = {
      name: optionValue, // 쉼표로 구분된 전체 옵션명
      price: totalPrice
    }
  })

  return additionalOptionsWithPrices
}

export const getOptionPrice = (
  product: Product,
  groupName: string,
  optionValue: string
): number => {
  let optionPrice = 0

  // 쉼표로 구분된 여러 옵션이 있을 수 있으므로 split
  const optionNames = optionValue.split(',').map(name => name.trim())

  optionNames.forEach(optionName => {
    product.options?.forEach(group => {
      if (group.groupName === groupName) {
        const selected = group.values.find(v => v.name === optionName)
        if (selected) {
          optionPrice += selected.price
        }
      }
    })
  })

  return optionPrice
}

export const getAdditionalOptionPrice = (
  product: Product,
  groupName: string,
  optionValue: string
): number => {
  let optionPrice = 0

  // 쉼표로 구분된 여러 옵션이 있을 수 있으므로 split
  const optionNames = optionValue.split(',').map(name => name.trim())

  optionNames.forEach(optionName => {
    product.additionalOptions?.forEach(group => {
      if (group.groupName === groupName) {
        const selected = group.values.find(v => v.name === optionName)
        if (selected) {
          optionPrice += selected.price
        }
      }
    })
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
      const productData = {
        id: productDoc.id,
        ...productDoc.data()
      } as Product

      // 리뷰 정보 가져오기
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
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Array<{ groupName: string; optionName: string }>>([])
  const [selectedAdditionalOptions, setSelectedAdditionalOptions] = useState<Array<{ groupName: string; optionName: string }>>([])
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
  const [parcelPaymentMethod, setParcelPaymentMethod] = useState<'선결제' | '착불'>('선결제')

  // 제품 좋아요 훅
  const { isLiked, likeCount, setLikeCount, handleLikeToggle } = useProductLike({
    productId,
    productName: product?.name || '',
    productImage: product?.images?.[0],
    initialLikeCount: 0
  })

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productData = await fetchProduct(productId)
        if (productData) {
          setProduct(productData)

          // likeCount 설정
          const productDoc = await getDoc(doc(db, 'products', productId))
          if (productDoc.exists()) {
            const data = productDoc.data()
            setLikeCount(data.likeCount || 0)
          }

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
            setQuantity(1)

            // 옵션이 설정되지 않은 경우 자동으로 기본 상품 추가
            if (!productData.optionsEnabled) {
              const defaultItem: CartItem = {
                options: {},
                additionalOptions: {},
                quantity: 1
              }
              setCartItems([defaultItem])
            }
          }

          // 배송방법 초기화 (첫 번째 배송방법 선택)
          if (productData.deliveryMethods && productData.deliveryMethods.length > 0) {
            setDeliveryMethod(productData.deliveryMethods[0])
          }

          // deliveryFeeSettings의 첫 번째 결제 방식을 기본값으로 설정
          if (productData.deliveryFeeSettings?.paymentMethods && productData.deliveryFeeSettings.paymentMethods.length > 0) {
            setParcelPaymentMethod(productData.deliveryFeeSettings.paymentMethods[0])
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
      // 같은 그룹의 기존 옵션을 제거하고 새로운 옵션으로 교체 (라디오 버튼처럼 동작)
      const filteredOptions = prev.filter(opt => opt.groupName !== groupName)

      // 이미 선택된 옵션인지 확인
      const existingIndex = prev.findIndex(
        opt => opt.groupName === groupName && opt.optionName === optionName
      )

      if (existingIndex !== -1) {
        // 이미 선택되어 있으면 제거 (체크 해제)
        return filteredOptions
      } else {
        // 선택되어 있지 않으면 추가 (같은 그룹의 다른 옵션은 제거됨)
        return [...filteredOptions, { groupName, optionName }]
      }
    })
  }

  const handleAdditionalOptionSelect = (groupName: string, optionName: string) => {
    setSelectedAdditionalOptions(prev => {
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
    setSelectedAdditionalOptions([])
    setQuantity(1)
    setCartItems([])
  }

  const addToCart = () => {
    if (selectedOptions.length === 0) {
      alert('옵션을 선택해주세요.')
      return
    }

    // 선택된 모든 옵션을 하나의 객체로 묶기
    const optionsObj: { [key: string]: string } = {}
    selectedOptions.forEach(selectedOption => {
      // 같은 그룹에 여러 옵션이 있으면 쉼표로 구분하여 저장
      if (optionsObj[selectedOption.groupName]) {
        optionsObj[selectedOption.groupName] += `, ${selectedOption.optionName}`
      } else {
        optionsObj[selectedOption.groupName] = selectedOption.optionName
      }
    })

    // 선택된 추가상품 옵션을 객체로 묶기
    const additionalOptionsObj: { [key: string]: string } = {}
    selectedAdditionalOptions.forEach(selectedOption => {
      if (additionalOptionsObj[selectedOption.groupName]) {
        additionalOptionsObj[selectedOption.groupName] += `, ${selectedOption.optionName}`
      } else {
        additionalOptionsObj[selectedOption.groupName] = selectedOption.optionName
      }
    })

    // 새로운 cartItem으로 추가 (초기 수량은 1)
    setCartItems(prev => [...prev, {
      options: optionsObj,
      additionalOptions: Object.keys(additionalOptionsObj).length > 0 ? additionalOptionsObj : undefined,
      quantity: 1
    }])

    setSelectedOptions([])
    setSelectedAdditionalOptions([])
  }

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateCartQuantity = (index: number, newQuantity: number) => {
    // 0 미만으로는 내려가지 않도록만 체크
    const validQuantity = Math.max(0, newQuantity)

    setCartItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: validQuantity } : item
    ))
  }

  const handleQuantityInputChange = (index: number, value: string) => {
    // 빈 문자열이면 그냥 빈 값으로 설정 (사용자가 입력 중)
    if (value === '') {
      setCartItems(prev => prev.map((item, i) =>
        i === index ? { ...item, quantity: 0 } : item
      ))
      return
    }

    const numValue = parseInt(value)
    if (!isNaN(numValue)) {
      // 제한 없이 바로 설정 (blur 시 검증)
      setCartItems(prev => prev.map((item, i) =>
        i === index ? { ...item, quantity: numValue } : item
      ))
    }
  }

  const saveToShoppingCart = async () => {
    if (!product || cartItems.length === 0) return

    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    // 옵션 검증 - optionsEnabled가 true일 때만 검증
    if (product.optionsEnabled) {
      const hasEmptyOptions = cartItems.some(item => {
        return !item.options || Object.keys(item.options).length === 0
      })

      if (hasEmptyOptions) {
        alert('상품 옵션을 선택해주세요.')
        return
      }
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
        // 가게 정보 가져오기
        const storeDoc = await getDoc(doc(db, 'stores', product.storeId))
        const storeData = storeDoc.exists() ? storeDoc.data() : null

        // 주문하기와 동일한 구조로 저장
        const orderItems = cartItems.map(item => {
          const optionsWithPrices = createOptionsWithPrices(product, item.options)
          const additionalOptionsWithPrices = item.additionalOptions
            ? createAdditionalOptionsWithPrices(product, item.additionalOptions)
            : undefined

          return {
            productId: productId,
            productName: product.name,
            options: item.options,
            additionalOptions: item.additionalOptions,
            optionsWithPrices: optionsWithPrices,
            additionalOptionsWithPrices: additionalOptionsWithPrices,
            quantity: item.quantity,
            price: product.discountedPrice || product.price,
            itemPrice: calculateItemPrice(product, item.options, item.quantity, item.additionalOptions)
          }
        })

        const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)

        const cartData = {
          uid: user.uid,
          storeId: product.storeId,
          storeName: storeData?.storeName || '',
          productId: productId,
          productName: product.name,
          productImage: product.images?.[0] || '',
          items: orderItems,
          totalProductPrice: totalPrice,
          totalQuantity: totalQuantity,
          deliveryMethod: deliveryMethod || '',
          request: storeRequest || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(deliveryMethod === '택배 배송' && product.deliveryFeeSettings && { deliveryFeeSettings: product.deliveryFeeSettings }),
          ...(deliveryMethod === '택배 배송' && parcelPaymentMethod && { parcelPaymentMethod: parcelPaymentMethod })
        }

        await addDoc(collection(db, 'shoppingCart'), cartData)

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

    // 옵션 검증 - optionsEnabled가 true일 때만 검증
    if (product.optionsEnabled) {
      const hasEmptyOptions = cartItems.some(item => {
        return !item.options || Object.keys(item.options).length === 0
      })

      if (hasEmptyOptions) {
        alert('상품 옵션을 선택해주세요.')
        return
      }
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
        const additionalOptionsWithPrices = item.additionalOptions
          ? createAdditionalOptionsWithPrices(product, item.additionalOptions)
          : undefined

        return {
          productId: productId,
          productName: product.name,
          price: product.discountedPrice || product.price,
          quantity: item.quantity,
          options: item.options,
          additionalOptions: item.additionalOptions,
          optionsWithPrices: optionsWithPrices,
          additionalOptionsWithPrices: additionalOptionsWithPrices,
          itemPrice: calculateItemPrice(product, item.options, item.quantity, item.additionalOptions)
        }
      })

      // shoppingCart 컬렉션에 저장 (orders가 아닌 shoppingCart에 저장)
      const cartDoc = await addDoc(collection(db, 'shoppingCart'), {
        uid: user.uid,
        productId: productId,
        productName: product.name,
        productImage: product.images?.[0] || '',
        storeId: product.storeId,
        storeName: store?.storeName || '',
        items: orderItems,
        totalProductPrice: totalPrice,
        totalQuantity: totalQuantity,
        deliveryMethod: deliveryMethod,
        request: storeRequest,
        deliveryFeeSettings: product.deliveryFeeSettings,
        parcelPaymentMethod: parcelPaymentMethod,
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

  const getItemPrice = (options: { [key: string]: string }, qty: number, additionalOptions?: { [key: string]: string }) => {
    return calculateItemPrice(product, options, qty, additionalOptions)
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
          <BottomModal
            isOpen={isModalOpen}
            modalHeight={modalHeight}
            onClose={() => setIsModalOpen(false)}
            onDragStart={handleDragStart}
          >
            {/* 옵션이 설정된 경우에만 OptionSelector 표시 */}
            {product.optionsEnabled && (
              <OptionSelector
                product={product}
                expandedOptions={expandedOptions}
                selectedOptions={selectedOptions}
                selectedAdditionalOptions={selectedAdditionalOptions}
                onToggleOption={toggleOption}
                onSelectOption={handleOptionSelect}
                onSelectAdditionalOption={handleAdditionalOptionSelect}
                onReset={resetOptions}
                onAddToCart={addToCart}
                hasCartItems={cartItems.length > 0}
              />
            )}

            <DeliveryMethodSelector
              deliveryMethods={product.deliveryMethods}
              selectedMethod={deliveryMethod}
              onMethodChange={setDeliveryMethod}
            />

            <SelectedItems
              product={product}
              cartItems={cartItems}
              storeRequest={storeRequest}
              deliveryMethod={deliveryMethod}
              parcelPaymentMethod={parcelPaymentMethod}
              onRemoveItem={removeFromCart}
              onUpdateQuantity={updateCartQuantity}
              onQuantityInputChange={handleQuantityInputChange}
              onStoreRequestChange={setStoreRequest}
              onSaveToCart={saveToShoppingCart}
              onOrder={handleOrder}
              onParcelPaymentMethodChange={setParcelPaymentMethod}
              calculateItemPrice={getItemPrice}
              calculateTotalPrice={getTotalPrice}
            />
          </BottomModal>
        </>
      )}
    </div>
  )
}
