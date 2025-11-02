'use client'

import { useRouter } from 'next/navigation'
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from 'firebase/auth'
import OptimizedImage from '@/components/common/OptimizedImage'
import { Product, CartItem, getOptionPrice, getAdditionalOptionPrice } from '../types'
import styles from './CartItemsSection.module.css'

interface CartItemsSectionProps {
  user: User | null
  productId: string
  product: Product
  storeName: string
  cartItems: CartItem[]
  storeRequest: string
  editingCartItemId: string | null
  isEditingOrder?: boolean
  additionalOrderId?: string | null
  onRemoveItem: (index: number) => void
  onUpdateQuantity: (index: number, newQuantity: number) => void
  onQuantityInputChange: (index: number, value: string) => void
  onStoreRequestChange: (value: string) => void
  onEditingCartItemIdChange: (id: string | null) => void
}

// Helper functions - 할인 유효성 검사
const isDiscountValid = (product: Product): boolean => {
  if (!product.discount) return false

  const now = new Date()

  // 항상 활성화된 할인
  if (product.discount.isAlwaysActive) return true

  // 기간 제한 할인
  if (product.discount.startDate && product.discount.endDate) {
    const startDate = new Date(product.discount.startDate)
    const endDate = new Date(product.discount.endDate)
    return now >= startDate && now <= endDate
  }

  return false
}

// Helper functions - 가격 계산
const calculateItemPrice = (
  product: Product,
  options: { [key: string]: string },
  qty: number,
  additionalOptions?: { [key: string]: string }
): number => {
  // 할인이 유효한 경우에만 discountedPrice 사용
  const basePrice = (isDiscountValid(product) && product.discountedPrice)
    ? product.discountedPrice
    : product.price
  let optionPrice = 0

  Object.entries(options).forEach(([groupName, optionValue]) => {
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

const createOptionsWithPrices = (
  product: Product,
  options: { [key: string]: string }
): { [key: string]: { name: string; price: number } } => {
  const optionsWithPrices: { [key: string]: { name: string; price: number } } = {}

  Object.entries(options).forEach(([groupName, optionValue]) => {
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

    optionsWithPrices[groupName] = {
      name: optionValue,
      price: totalPrice
    }
  })

  return optionsWithPrices
}

const createAdditionalOptionsWithPrices = (
  product: Product,
  additionalOptions: { [key: string]: string }
): { [key: string]: { name: string; price: number } } => {
  const additionalOptionsWithPrices: { [key: string]: { name: string; price: number } } = {}

  Object.entries(additionalOptions).forEach(([groupName, optionValue]) => {
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

    additionalOptionsWithPrices[groupName] = {
      name: optionValue,
      price: totalPrice
    }
  })

  return additionalOptionsWithPrices
}

export default function CartItemsSection({
  user,
  productId,
  product,
  storeName,
  cartItems,
  storeRequest,
  editingCartItemId,
  isEditingOrder = false,
  additionalOrderId,
  onRemoveItem,
  onUpdateQuantity,
  onQuantityInputChange,
  onStoreRequestChange,
  onEditingCartItemIdChange
}: CartItemsSectionProps) {
  const router = useRouter()

  // 총 가격 계산
  const calculateTotalPrice = (): number => {
    return cartItems.reduce((total, item) => {
      return total + calculateItemPrice(product, item.options, item.quantity, item.additionalOptions)
    }, 0)
  }

  // 장바구니 저장 로직
  const handleSaveToCart = async () => {
    if (!product || cartItems.length === 0) return

    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    // 옵션 검증
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

    // quantityRanges가 있으면 그것을 사용, 없으면 기존 방식
    const minQty = product.quantityRanges && product.quantityRanges.length > 0
      ? 10  // 하드코딩: 최소 10개
      : (product.minOrderQuantity || 1)

    const maxQty = product.quantityRanges && product.quantityRanges.length > 0
      ? product.quantityRanges[product.quantityRanges.length - 1].maxQuantity
      : (product.maxOrderQuantity || 999)

    if (!additionalOrderId && totalQuantity < minQty) {
      alert(`최소 주문 수량은 ${minQty}개입니다. (현재: ${totalQuantity}개)`)
      return
    }

    if (totalQuantity > maxQty) {
      alert(`최대 주문 수량은 ${maxQty}개입니다. (현재: ${totalQuantity}개)`)
      return
    }

    try {
      const totalPrice = calculateTotalPrice()

      const orderItems = cartItems.map(item => {
        const optionsWithPrices = createOptionsWithPrices(product, item.options)
        const additionalOptionsWithPrices = item.additionalOptions
          ? createAdditionalOptionsWithPrices(product, item.additionalOptions)
          : undefined

        const orderItem: Record<string, unknown> = {
          productId: productId,
          productName: product.name,
          price: (isDiscountValid(product) && product.discountedPrice) ? product.discountedPrice : product.price,
          quantity: item.quantity,
          options: item.options,
          optionsWithPrices: optionsWithPrices,
          itemPrice: calculateItemPrice(product, item.options, item.quantity, item.additionalOptions),
          isAddItem: false  // 최초 주문 (추가 주문이 아님)
        }

        if (item.additionalOptions) {
          orderItem.additionalOptions = item.additionalOptions
        }
        if (additionalOptionsWithPrices) {
          orderItem.additionalOptionsWithPrices = additionalOptionsWithPrices
        }

        return orderItem
      })

      if (editingCartItemId) {
        const collectionName = isEditingOrder ? 'orders' : 'shoppingCart'
        const docRef = doc(db, collectionName, editingCartItemId)
        const existingDoc = await getDoc(docRef)
        const existingData = existingDoc.data()

        const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)

        const updateData: Record<string, unknown> = {
          items: orderItems,
          totalProductPrice: totalPrice,
          totalQuantity: totalQuantity,
          request: storeRequest || existingData?.request || '',
          updatedAt: new Date()
        }

        await updateDoc(docRef, updateData)

        if (isEditingOrder) {
          alert('주문이 수정되었습니다.')
          // orders인 경우 payments 페이지로 돌아가기 (새로고침하여 데이터 다시 로드)
          window.location.href = `/payments?orderId=${editingCartItemId}`
        } else {
          alert('장바구니가 수정되었습니다.')
          router.push('/cart')
        }
        onEditingCartItemIdChange(null)
      } else {
        const storeDoc = await getDoc(doc(db, 'stores', product.storeId))
        const storeData = storeDoc.exists() ? storeDoc.data() : null

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
          request: storeRequest || '',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        await addDoc(collection(db, 'shoppingCart'), cartData)

        alert('장바구니에 추가되었습니다.')
        router.push('/cart')
      }
    } catch (error) {
      console.error('장바구니 저장 실패:', error)
      alert('장바구니 저장에 실패했습니다.')
    }
  }

  // 주문하기 로직
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

    // 옵션 검증
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

    // quantityRanges가 있으면 그것을 사용, 없으면 기존 방식
    const minQty = product.quantityRanges && product.quantityRanges.length > 0
      ? 10  // 하드코딩: 최소 10개
      : (product.minOrderQuantity || 1)

    const maxQty = product.quantityRanges && product.quantityRanges.length > 0
      ? product.quantityRanges[product.quantityRanges.length - 1].maxQuantity
      : (product.maxOrderQuantity || 999)

    if (!additionalOrderId && totalQuantity < minQty) {
      alert(`최소 주문 수량은 ${minQty}개입니다. (현재: ${totalQuantity}개)`)
      return
    }

    if (totalQuantity > maxQty) {
      alert(`최대 주문 수량은 ${maxQty}개입니다. (현재: ${totalQuantity}개)`)
      return
    }

    try {
      const totalPrice = calculateTotalPrice()

      const orderItems = cartItems.map(item => {
        const optionsWithPrices = createOptionsWithPrices(product, item.options)
        const additionalOptionsWithPrices = item.additionalOptions
          ? createAdditionalOptionsWithPrices(product, item.additionalOptions)
          : undefined

        const orderItem: Record<string, unknown> = {
          productId: productId,
          productName: product.name,
          price: (isDiscountValid(product) && product.discountedPrice) ? product.discountedPrice : product.price,
          quantity: item.quantity,
          options: item.options,
          optionsWithPrices: optionsWithPrices,
          itemPrice: calculateItemPrice(product, item.options, item.quantity, item.additionalOptions),
          isAddItem: false  // 최초 주문 (추가 주문이 아님)
        }

        if (item.additionalOptions) {
          orderItem.additionalOptions = item.additionalOptions
        }
        if (additionalOptionsWithPrices) {
          orderItem.additionalOptionsWithPrices = additionalOptionsWithPrices
        }

        return orderItem
      })

      // 추가 주문인 경우 sessionStorage에 임시 저장하고 결제 페이지로 이동
      // 실제 items 추가는 결제 완료 후에만 처리
      if (additionalOrderId) {
        console.log('[CartItemsSection] 추가 결제 처리 시작:', additionalOrderId)
        console.log('[CartItemsSection] isEditingOrder:', isEditingOrder)

        // 새로운 추가 주문 아이템들 (결제 전이라 paymentId는 없음)
        const newItemsForAdditionalOrder = orderItems.map((item: Record<string, unknown>) => ({
          ...item,
          isAddItem: true  // 추가 주문 표시
        }))

        // sessionStorage에 추가 주문 정보 저장 (임시)
        const additionalOrderData = {
          orderId: additionalOrderId,
          items: newItemsForAdditionalOrder,
          totalProductPrice: totalPrice,
          totalQuantity: totalQuantity
        }

        sessionStorage.setItem('additionalOrderData', JSON.stringify(additionalOrderData))

        console.log('[CartItemsSection] 추가 주문 데이터 sessionStorage 저장 완료, 결제 페이지로 이동')
        router.push(`/payments?orderId=${additionalOrderId}&additionalOrderId=${additionalOrderId}`)
        return
      }

      const orderData = {
        uid: user.uid,
        productId: productId,
        productName: product.name,
        productImage: product.images?.[0] || '',
        storeId: product.storeId,
        storeName: storeName || '',
        items: orderItems,
        totalProductPrice: totalPrice,
        totalQuantity: totalQuantity,
        request: storeRequest,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      let cartId: string

      if (editingCartItemId) {
        console.log('[CartItemsSection] 기존 장바구니 아이템 수정:', editingCartItemId)
        const cartRef = doc(db, 'shoppingCart', editingCartItemId)
        const existingDoc = await getDoc(cartRef)
        const existingData = existingDoc.data()

        await updateDoc(cartRef, {
          ...orderData,
          createdAt: existingData?.createdAt || new Date(),
          updatedAt: new Date()
        })
        cartId = editingCartItemId
      } else {
        const docRef = await addDoc(collection(db, 'shoppingCart'), orderData)
        cartId = docRef.id
      }

      router.push(`/payments?cartId=${cartId}`)
    } catch (error) {
      console.error('주문 생성 실패:', error)
      alert('주문 생성에 실패했습니다.')
    }
  }

  // 전체 수량 계산
  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0)

  // 최소/최대 주문 수량 - quantityRanges가 있으면 그것을 사용
  const minQty = product.quantityRanges && product.quantityRanges.length > 0
    ? 10  // 하드코딩: 최소 10개
    : (product.minOrderQuantity || 1)

  const maxQty = product.quantityRanges && product.quantityRanges.length > 0
    ? product.quantityRanges[product.quantityRanges.length - 1].maxQuantity
    : (product.maxOrderQuantity || 999)

  // 버튼 활성화 여부 - 추가 주문인 경우 최소 수량 체크 안 함
  const isOrderValid = additionalOrderId
    ? totalQuantity <= maxQty
    : totalQuantity >= minQty && totalQuantity <= maxQty

  return (
    <div className={styles.selectedSection}>
      <h3 className={styles.selectedTitle}>선택된 상품</h3>
      <div className={styles.selectedItem}>
        {cartItems.map((item, index) => {
          // 옵션이 없고 항목이 1개만 있으면 삭제 불가
          const hasOptions = Object.keys(item.options).length > 0 || (item.additionalOptions && Object.keys(item.additionalOptions).length > 0)
          const canRemove = cartItems.length > 1 || hasOptions

          return (
          <div key={index} className={styles.cartItemWrapper}>
            <div className={styles.selectedHeader}>
              <div className={styles.selectedName}>{product.name}</div>
              {canRemove && (
                <button
                  onClick={() => onRemoveItem(index)}
                  className={styles.removeButton}
                >
                  <OptimizedImage
                    src="/icons/trash.svg"
                    alt="삭제"
                    width={16}
                    height={16}
                  />
                </button>
              )}
            </div>
            {/* 옵션이 있을 때만 표시 */}
            {Object.keys(item.options).length > 0 && (
              <div className={styles.optionSection}>
                <div className={styles.optionSectionTitle}>상품 옵션</div>
                {Object.entries(item.options).map(([groupName, optionValue]) => {
                  const optionNames = optionValue.split(',').map(name => name.trim())

                  return (
                    <div key={groupName}>
                      {optionNames.map((optionName, idx) => {
                        const optionPrice = getOptionPrice(product, groupName, optionName)

                        return (
                          <div key={`${groupName}-${idx}`} className={styles.selectedOption}>
                            <div>
                              <span className={styles.optionGroupName}>[{groupName}]</span>
                              <span>{optionName}</span>
                            </div>
                            <span className={styles.optionPrice}>+{optionPrice.toLocaleString()}원</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
            {item.additionalOptions && Object.keys(item.additionalOptions).length > 0 && (
              <div className={styles.optionSection}>
                <div className={styles.optionSectionTitle}>추가상품</div>
                {Object.entries(item.additionalOptions).map(([groupName, optionValue]) => {
                  const optionNames = optionValue.split(',').map(name => name.trim())

                  return (
                    <div key={`additional-${groupName}`}>
                      {optionNames.map((optionName, idx) => {
                        const optionPrice = getAdditionalOptionPrice(product, groupName, optionName)

                        return (
                          <div key={`additional-${groupName}-${idx}`} className={styles.selectedOption}>
                            <div>
                              <span className={styles.optionGroupName}>[{groupName}]</span>
                              <span>{optionName}</span>
                            </div>
                            <span className={styles.optionPrice}>+{optionPrice.toLocaleString()}원</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
            <div className={styles.quantityControl}>
              <button
                onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                className={styles.quantityButton}
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={item.quantity || ''}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || /^\d+$/.test(value)) {
                    onQuantityInputChange(index, value)
                  }
                }}
                className={styles.quantityValue}
              />
              <button
                onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                className={styles.quantityButton}
              >
                +
              </button>
            </div>
            <div className={styles.itemPrice}>
              {calculateItemPrice(product, item.options, item.quantity, item.additionalOptions).toLocaleString()}원
            </div>
          </div>
          )
        })}
      </div>

      {/* 매장 요청사항 */}
      <div className={styles.requestContainer}>
        <h3 className={styles.requestTitle}>매장 요청사항</h3>
        <div className={styles.requestSection}>
          <textarea
            className={styles.requestTextarea}
            placeholder="매장에 전달할 요청사항을 입력해주세요"
            value={storeRequest}
            onChange={(e) => onStoreRequestChange(e.target.value)}
            maxLength={500}
          />
          <div className={styles.requestCount}>
            {storeRequest.length}/500
          </div>
        </div>
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
          {!additionalOrderId && (
            <button
              className={styles.cartButton}
              onClick={handleSaveToCart}
              disabled={!isOrderValid}
            >
              장바구니
            </button>
          )}
          <button
            className={additionalOrderId ? styles.orderButtonFull : styles.orderButton}
            onClick={handleOrder}
            disabled={!isOrderValid}
          >
            {additionalOrderId ? '추가 결제하기' : '주문하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
