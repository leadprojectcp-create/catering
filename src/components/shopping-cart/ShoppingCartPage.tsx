'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { getCartItems, deleteCartItem, updateCartItem, type CartItem } from '@/lib/services/cartService'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Header from '@/components/Header'
import Loading from '@/components/Loading'
import styles from './ShoppingCartPage.module.css'

interface Product {
  options?: {
    groupName: string
    values: { name: string; price: number }[]
  }[]
}

export default function ShoppingCartPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [products, setProducts] = useState<{ [key: string]: Product }>({})

  useEffect(() => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    loadCartItems()
  }, [user])

  const loadCartItems = async () => {
    if (!user) return

    try {
      const items = await getCartItems(user.uid)

      // 각 상품의 옵션 정보를 가져오기
      const productIds = [...new Set(items.map(item => item.productId))]
      const productData: { [key: string]: Product } = {}
      const validItemIds = new Set<string>()

      for (const productId of productIds) {
        try {
          const productDoc = await getDoc(doc(db, 'products', productId))
          if (productDoc.exists()) {
            productData[productId] = productDoc.data() as Product
            // 이 productId를 가진 아이템들을 유효한 것으로 표시
            items.forEach(item => {
              if (item.productId === productId) {
                validItemIds.add(item.id!)
              }
            })
          } else {
            console.warn(`상품을 찾을 수 없습니다: ${productId}`)
          }
        } catch (error) {
          console.error(`상품 로드 실패 (${productId}):`, error)
        }
      }

      // 유효한 상품만 필터링
      const validItems = items.filter(item => validItemIds.has(item.id!))

      setCartItems(validItems)
      setSelectedItems(validItems.map(item => item.id!))
      setProducts(productData)

      // 삭제된 상품이 있으면 알림
      if (validItems.length < items.length) {
        const deletedCount = items.length - validItems.length
        alert(`${deletedCount}개의 상품이 더 이상 판매되지 않아 장바구니에서 제외되었습니다.`)
      }
    } catch (error) {
      console.error('장바구니 로드 실패:', error)
      alert('장바구니를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectItem = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId))
    } else {
      setSelectedItems([...selectedItems, itemId])
    }
  }

  const handleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(cartItems.map(item => item.id!))
    }
  }

  // items 배열 구조에서는 수량 변경이 복잡하므로
  // 수정 버튼을 통해서만 변경 가능

  const handleEditItem = (item: CartItem) => {
    // 상품이 존재하는지 확인
    if (!products[item.productId]) {
      alert('상품 정보를 찾을 수 없습니다. 이 상품은 더 이상 판매되지 않습니다.')
      return
    }

    // 장바구니 아이템 데이터를 세션 스토리지에 저장
    // items 배열 전체를 전달
    if (!item.items || item.items.length === 0) {
      alert('장바구니 아이템 정보가 없습니다.')
      return
    }

    sessionStorage.setItem('editCartItem', JSON.stringify({
      cartItemId: item.id,
      items: item.items  // 전체 items 배열 전달
    }))

    // 상품 주문 페이지로 이동
    router.push(`/order/${item.productId}`)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('이 상품을 장바구니에서 삭제하시겠습니까?')) return

    try {
      await deleteCartItem(itemId)
      setCartItems(cartItems.filter(item => item.id !== itemId))
      setSelectedItems(selectedItems.filter(id => id !== itemId))
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) {
      alert('삭제할 상품을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedItems.length}개 상품을 삭제하시겠습니까?`)) return

    try {
      await Promise.all(selectedItems.map(id => deleteCartItem(id)))
      setCartItems(cartItems.filter(item => !selectedItems.includes(item.id!)))
      setSelectedItems([])
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const calculateItemPrice = (item: CartItem): number => {
    const product = products[item.productId]
    let totalPrice = 0

    // items 배열의 모든 옵션 조합 가격 계산
    item.items.forEach(cartItemOption => {
      let itemPrice = item.productPrice

      if (product?.options) {
        Object.values(cartItemOption.options).forEach(optionValue => {
          product.options?.forEach(group => {
            const selected = group.values.find(v => v.name === optionValue)
            if (selected) {
              itemPrice += selected.price
            }
          })
        })
      }

      totalPrice += itemPrice * cartItemOption.quantity
    })

    return totalPrice
  }

  const calculateTotalPrice = (): number => {
    return cartItems
      .filter(item => selectedItems.includes(item.id!))
      .reduce((total, item) => total + calculateItemPrice(item), 0)
  }

  const handleOrder = () => {
    if (selectedItems.length === 0) {
      alert('주문할 상품을 선택해주세요.')
      return
    }

    const selectedCartItems = cartItems.filter(item => selectedItems.includes(item.id!))

    // 스토어별로 그룹화
    const itemsByStore: { [storeId: string]: CartItem[] } = {}
    selectedCartItems.forEach(item => {
      if (!itemsByStore[item.storeId]) {
        itemsByStore[item.storeId] = []
      }
      itemsByStore[item.storeId].push(item)
    })

    // 여러 스토어의 상품이 있는 경우
    if (Object.keys(itemsByStore).length > 1) {
      alert('한 번에 하나의 매장 상품만 주문할 수 있습니다.')
      return
    }

    // 상품별로 그룹화
    const itemsByProduct: { [productId: string]: CartItem[] } = {}
    selectedCartItems.forEach(item => {
      if (!itemsByProduct[item.productId]) {
        itemsByProduct[item.productId] = []
      }
      itemsByProduct[item.productId].push(item)
    })

    // 여러 상품이 있는 경우
    if (Object.keys(itemsByProduct).length > 1) {
      alert('한 번에 하나의 상품만 주문할 수 있습니다.')
      return
    }

    const firstItem = selectedCartItems[0]
    const product = products[firstItem.productId]

    // 주문 데이터 구성 - items 배열을 펼쳐서 개별 옵션 조합으로 변환
    const itemsWithPrices = selectedCartItems.flatMap(cartItem => {
      return cartItem.items.map(itemOption => {
        const optionsWithPrices: { [key: string]: { name: string; price: number } } = {}

        Object.entries(itemOption.options).forEach(([groupName, optionValue]) => {
          const group = product?.options?.find(g => g.groupName === groupName)
          const selected = group?.values.find(v => v.name === optionValue as string)

          optionsWithPrices[groupName] = {
            name: optionValue as string,
            price: selected?.price || 0
          }
        })

        let itemPrice = cartItem.productPrice
        Object.values(itemOption.options).forEach(optionValue => {
          product?.options?.forEach(group => {
            const selected = group.values.find(v => v.name === optionValue)
            if (selected) {
              itemPrice += selected.price
            }
          })
        })

        return {
          options: itemOption.options,
          optionsWithPrices,
          quantity: itemOption.quantity,
          itemPrice: itemPrice * itemOption.quantity
        }
      })
    })

    const orderData = {
      storeId: firstItem.storeId,
      storeName: '', // 필요시 store 정보도 가져와야 함
      productId: firstItem.productId,
      productName: firstItem.productName,
      productPrice: firstItem.productPrice,
      productImage: firstItem.productImage,
      items: itemsWithPrices,
      totalPrice: calculateTotalPrice()
    }

    sessionStorage.setItem('orderData', JSON.stringify(orderData))
    router.push('/payments')
  }

  if (loading) {
    return (
      <>
        <Header />
        <Loading />
      </>
    )
  }

  if (cartItems.length === 0) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.empty}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <p>장바구니가 비어있습니다.</p>
            <button onClick={() => router.push('/')} className={styles.goShoppingButton}>
              쇼핑 계속하기
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>장바구니</h1>
          <div className={styles.headerActions}>
            <button onClick={handleSelectAll} className={styles.selectAllButton}>
              {selectedItems.length === cartItems.length ? '전체 해제' : '전체 선택'}
            </button>
            <button onClick={handleDeleteSelected} className={styles.deleteSelectedButton}>
              선택 삭제
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.itemsList}>
            {cartItems.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id!)}
                  onChange={() => handleSelectItem(item.id!)}
                  className={styles.checkbox}
                />

                <div className={styles.itemImage}>
                  {item.productImage && (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                </div>

                <div className={styles.itemInfo}>
                  <h3 className={styles.itemName}>{item.productName}</h3>
                  {/* items 배열의 모든 옵션 표시 */}
                  {item.items.map((itemOption, index) => (
                    <div key={index} className={styles.itemOptionGroup}>
                      <div className={styles.itemOptions}>
                        {Object.entries(itemOption.options).map(([groupName, value]) => (
                          <span key={groupName} className={styles.optionTag}>
                            {groupName}: {value}
                          </span>
                        ))}
                        <span className={styles.optionQuantity}>x {itemOption.quantity}</span>
                      </div>
                    </div>
                  ))}
                  <div className={styles.itemPrice}>
                    합계: {(item.totalPrice || calculateItemPrice(item)).toLocaleString()}원
                  </div>
                </div>

                <div className={styles.itemActions}>
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => handleEditItem(item)}
                      className={styles.editButton}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id!)}
                      className={styles.deleteButton}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>선택 상품 수</span>
              <span>{selectedItems.length}개</span>
            </div>
            <div className={styles.summaryRow}>
              <span>총 수량</span>
              <span>
                {cartItems
                  .filter(item => selectedItems.includes(item.id!))
                  .reduce((sum, item) => {
                    const itemTotal = item.items.reduce((itemSum, opt) => itemSum + opt.quantity, 0)
                    return sum + itemTotal
                  }, 0)}개
              </span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryTotal}>
              <span>총 결제금액</span>
              <span className={styles.totalPrice}>
                {calculateTotalPrice().toLocaleString()}원
              </span>
            </div>
            <button onClick={handleOrder} className={styles.orderButton}>
              주문하기
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
