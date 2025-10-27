'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { getCartItems, deleteCartItem, updateCartItem, type CartItem, type CartItemOption } from '@/lib/services/cartService'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Loading from '@/components/Loading'
import QuoteEstimate from './QuoteEstimate'
import styles from './ShoppingCartPage.module.css'

interface Product {
  images?: string[]
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
  const [quoteItem, setQuoteItem] = useState<CartItem | null>(null)

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

    const editData = {
      cartItemId: item.id,
      items: item.items  // 전체 items 배열 전달
    }

    console.log('[ShoppingCart] 수정 데이터 저장:', editData)
    console.log('[ShoppingCart] item.items:', item.items)

    sessionStorage.setItem('editCartItem', JSON.stringify(editData))

    // 상품 주문 페이지로 이동
    router.push(`/productDetail/${item.productId}`)
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
    // 새로운 구조에서는 totalProductPrice를 사용
    if (item.totalProductPrice) {
      return item.totalProductPrice
    }

    // items 배열에 itemPrice가 있으면 합산
    if (item.items && item.items.length > 0) {
      return item.items.reduce((sum, cartItem: CartItemOption & { itemPrice?: number }) => {
        if (cartItem.itemPrice) {
          return sum + cartItem.itemPrice
        }
        // 하위 호환: 기존 방식
        let itemPrice = item.productPrice || 0
        const product = products[item.productId]
        if (product?.options) {
          Object.values(cartItem.options).forEach(optionValue => {
            product.options?.forEach(group => {
              const selected = group.values.find(v => v.name === optionValue)
              if (selected) {
                itemPrice += selected.price
              }
            })
          })
        }
        return sum + (itemPrice * cartItem.quantity)
      }, 0)
    }

    return 0
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

    // cartId를 URL 파라미터로 전달하여 PaymentsPage에서 shoppingCart 컬렉션에서 데이터를 가져오도록 함
    router.push(`/payments?cartId=${firstItem.id}`)
  }

  if (loading) {
    return <Loading />
  }

  if (cartItems.length === 0) {
    return (
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
    )
  }

  return (
    <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>장바구니</h1>
          <div className={styles.headerActions}>
            <button onClick={handleSelectAll} className={styles.selectAllButton}>
              <input
                type="checkbox"
                checked={selectedItems.length === cartItems.length}
                onChange={handleSelectAll}
                className={styles.checkbox}
                readOnly
              />
              전체선택
            </button>
            {selectedItems.length > 0 && (
              <button onClick={handleDeleteSelected} className={styles.deleteSelectedButton}>
                <img src="/icons/close.png" alt="삭제" width="24" height="24" />
                선택삭제
              </button>
            )}
          </div>
        </div>

        <div className={styles.itemsList}>
          {cartItems.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.itemTop}>
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
                        alt={item.productName || '상품'}
                        width={100}
                        height={100}
                        style={{ objectFit: 'cover' }}
                      />
                    )}
                  </div>

                  <div className={styles.itemInfo}>
                    <div className={styles.storeName}>{item.storeName}</div>
                    <div className={styles.itemName}>{item.productName || '상품'}</div>
                    <div className={styles.itemPrice}>
                      {(item.totalProductPrice || calculateItemPrice(item)).toLocaleString()}원
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      onClick={() => handleEditItem(item)}
                      className={styles.editButton}
                    >
                      주문수정
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id!)}
                      className={styles.deleteButton}
                    >
                      주문삭제
                    </button>
                  </div>
                </div>

                {/* items 배열의 모든 옵션 표시 */}
                <div className={styles.optionsContainer}>
                  {item.items.map((itemOption, index) => (
                    <div key={index} className={styles.itemOptionGroup}>
                      <div className={styles.optionsWrapper}>
                        {/* 상품 옵션 */}
                        <div className={styles.optionSection}>
                          <div className={styles.optionSectionTitle}>상품 옵션</div>
                          <div className={styles.optionsList}>
                            {Object.keys(itemOption.options).length > 0 ? (
                              Object.entries(itemOption.options).map(([groupName, value]) => {
                                // 옵션 가격 찾기
                                let optionPrice = 0
                                if (itemOption.optionsWithPrices && itemOption.optionsWithPrices[groupName]) {
                                  optionPrice = itemOption.optionsWithPrices[groupName].price
                                }
                                return (
                                  <div key={groupName} className={styles.optionText}>
                                    <span className={styles.optionGroupName}>[{groupName}]</span> {value} +{optionPrice.toLocaleString()}원
                                  </div>
                                )
                              })
                            ) : (
                              <div className={styles.optionText}>
                                <span className={styles.optionGroupName}>[기본]</span> 기본 +0원
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 추가상품 */}
                        {itemOption.additionalOptions && Object.keys(itemOption.additionalOptions).length > 0 && (
                          <div className={styles.optionSection}>
                            <div className={styles.optionSectionTitle}>추가상품</div>
                            <div className={styles.optionsList}>
                              {Object.entries(itemOption.additionalOptions).map(([groupName, value]) => {
                                // 추가옵션 가격 찾기
                                let optionPrice = 0
                                if (itemOption.additionalOptionsWithPrices && itemOption.additionalOptionsWithPrices[groupName]) {
                                  optionPrice = itemOption.additionalOptionsWithPrices[groupName].price
                                }
                                return (
                                  <div key={groupName} className={styles.optionText}>
                                    <span className={styles.optionGroupName}>[{groupName}]</span> {value} +{optionPrice.toLocaleString()}원
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <span className={styles.optionQuantity}>{itemOption.quantity}개</span>
                    </div>
                  ))}
                </div>

                {/* 구분선 */}
                <div className={styles.divider}></div>

                {/* 개별 주문 정보 */}
                <div className={styles.itemPaymentInfo}>
                  <div className={styles.paymentHeader}>
                    <h3 className={styles.paymentTitle}>결제 예상 금액</h3>
                    <div className={styles.quoteButtons}>
                      <button className={styles.quoteShareButton}>견적서 공유</button>
                      <button
                        className={styles.quotePrintButton}
                        onClick={() => setQuoteItem(item)}
                      >
                        견적서 출력
                      </button>
                    </div>
                  </div>
                  <div className={styles.itemPaymentRow}>
                    <span>총 상품수량</span>
                    <span className={styles.quantityValue}>{item.totalQuantity || item.items.reduce((sum, opt) => sum + opt.quantity, 0)}개</span>
                  </div>
                  <div className={styles.itemPaymentRow}>
                    <span>총 결제금액</span>
                    <span className={styles.priceValue}>
                      {(item.totalProductPrice || calculateItemPrice(item)).toLocaleString()}원
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedItems([item.id!])
                      handleOrder()
                    }}
                    className={styles.itemOrderButton}
                  >
                    주문하기
                  </button>
                </div>
              </div>
            ))}
        </div>

        {quoteItem && (
          <QuoteEstimate
            item={quoteItem}
            onClose={() => setQuoteItem(null)}
          />
        )}
      </div>
  )
}
