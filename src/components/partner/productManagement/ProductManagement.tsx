'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './ProductManagement.module.css'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import ProductPreviewModal from '../product/common/modals/ProductPreviewModal'

interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  description: string
  images?: string[]
  status: 'active' | 'inactive' | 'pending'
  partnerId: string
  createdAt: Date
  updatedAt: Date
  deliveryMethods?: string[]
  additionalSettings?: string[]
  productTypes?: string[]
  discountedPrice?: number
  discount?: {
    discountAmount: number
    discountPercent: number
    startDate: string | null
    endDate: string | null
    isAlwaysActive: boolean
  }
  quantityRanges?: {
    daysBeforeOrder: number
    minQuantity: number
    maxQuantity: number
  }[]
  origin?: { ingredient: string; origin: string }[]
}

export default function ProductManagement() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewProduct, setPreviewProduct] = useState<MenuItem | null>(null)

  // 할인 기간이 유효한지 체크하는 함수
  const isDiscountValid = (item: MenuItem) => {
    if (!item.discount || !item.discount.discountPercent || item.discount.discountPercent <= 0) {
      return false
    }

    // 상시 적용이거나 기간이 설정되지 않은 경우
    if (!item.discount.startDate || !item.discount.endDate) {
      return true
    }

    const now = new Date()
    const startDate = new Date(item.discount.startDate)
    const endDate = new Date(item.discount.endDate)

    // 현재 시간이 시작일과 종료일 사이에 있는지 체크
    return now >= startDate && now <= endDate
  }

  const fetchMenuItems = useCallback(async () => {
    if (!user?.uid) return

    try {
      const q = query(collection(db, 'products'), where('partnerId', '==', user.uid))
      const querySnapshot = await getDocs(q)
      const items: MenuItem[] = []

      querySnapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data()
        } as MenuItem)
      })

      setMenuItems(items)
      setFilteredItems(items)
      setLoading(false)
    } catch (error) {
      console.error('상품 목록 가져오기 실패:', error)
      setLoading(false)
    }
  }, [user?.uid])

  // 상품 목록 가져오기
  useEffect(() => {
    if (user?.uid) {
      fetchMenuItems()
    }
  }, [user?.uid, fetchMenuItems])

  // 필터링 및 검색
  useEffect(() => {
    let filtered = menuItems

    // 상태 필터링
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.status === filter)
    }

    // 검색어 필터링
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredItems(filtered)
  }, [filter, menuItems, searchQuery])


  // 상품 삭제
  const handleDeleteMenu = async (itemId: string) => {
    if (confirm('정말 이 상품을 삭제하시겠습니까?')) {
      try {
        // 1. 해당 상품이 포함된 장바구니 아이템 찾기
        const cartQuery = query(
          collection(db, 'shoppingCart'),
          where('productId', '==', itemId)
        )
        const cartSnapshot = await getDocs(cartQuery)

        // 2. 장바구니 아이템 모두 삭제
        const cartDeletePromises = cartSnapshot.docs.map(cartDoc =>
          deleteDoc(doc(db, 'shoppingCart', cartDoc.id))
        )
        await Promise.all(cartDeletePromises)

        // 3. 상품 삭제
        await deleteDoc(doc(db, 'products', itemId))

        fetchMenuItems()

        if (cartSnapshot.size > 0) {
          alert(`상품이 삭제되었습니다.\n${cartSnapshot.size}개의 장바구니 아이템도 함께 제거되었습니다.`)
        } else {
          alert('상품이 삭제되었습니다.')
        }
      } catch (error) {
        console.error('상품 삭제 실패:', error)
        alert('상품 삭제에 실패했습니다.')
      }
    }
  }

  // 판매 상태 토글
  const toggleAvailability = async (item: MenuItem) => {
    try {
      await updateDoc(doc(db, 'products', item.id), {
        status: item.status === 'active' ? 'inactive' : 'active',
        updatedAt: serverTimestamp()
      })
      fetchMenuItems()
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }



  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>상품 목록을 불러오는 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로그인이 필요합니다.</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>상품 관리</h1>
        <p className={styles.subtitle}>
          상품 관리 페이지에서 새로운 상품을 등록하거나 기존 상품을 수정할 수 있습니다. 가격, 사진, 설명 등을 자유롭게 변경하고, 판매 상태를 설정해 고객에게 최신 정보를 제공해주세요.
        </p>
        <div className={styles.actionBar}>
          <div className={styles.filterButtons}>
            <button
              className={filter === 'all' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setFilter('all')}
            >
              전체
            </button>
            <button
              className={filter === 'active' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setFilter('active')}
            >
              판매중
            </button>
            <button
              className={filter === 'inactive' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setFilter('inactive')}
            >
              숨김
            </button>
            <button
              className={filter === 'pending' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setFilter('pending')}
            >
              심사중
            </button>
          </div>
          <button
            className={styles.addButton}
            onClick={() => router.push('/partner/product/add')}
          >
            + 상품 추가
          </button>
        </div>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="상품명을 검색해 주세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 15L21 21M10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17Z" stroke="#4E5968" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <div className={styles.menuGrid}>
        {filteredItems.length === 0 ? (
          <div className={styles.emptyState}>
            <p>등록된 상품이 없습니다.</p>
            <p>새로운 상품을 추가해주세요.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className={styles.menuCard}>
              <div className={`${styles.menuTop} ${item.status !== 'active' ? styles.inactive : ''}`}>
                {item.status !== 'active' && (
                  <div className={styles.statusOverlay}>
                    {item.status === 'inactive' ? '숨김' : '심사중'}
                  </div>
                )}
                <div className={styles.menuInfo}>
                  <div className={styles.menuHeader}>
                    <div className={styles.firstRow}>
                      {item.productTypes && item.productTypes.length > 0 && (
                        <span className={styles.productTypesContainer}>
                          {item.productTypes.map((type, index) => (
                            <span key={index} className={styles.productTypeBadge}>
                              {type.replace('상품', '')}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <h3 className={styles.menuName}>
                      {item.name}
                    </h3>
                  </div>

                  {isDiscountValid(item) && item.discountedPrice ? (
                    <div className={styles.priceRow}>
                      <span className={styles.originalPrice}>{item.price.toLocaleString()}원</span>
                      <div className={styles.discountRow}>
                        <span className={styles.discountedPrice}>{item.discountedPrice.toLocaleString()}원</span>
                        <span className={styles.discountPercent}>{item.discount!.discountPercent}%</span>
                      </div>
                    </div>
                  ) : (
                    <span className={styles.regularPrice}>{item.price.toLocaleString()}원</span>
                  )}

                  {item.quantityRanges && item.quantityRanges.length > 0 && (
                    <div className={styles.orderQuantity}>
                      최소 {item.quantityRanges[0].minQuantity}개 ~ 최대 {item.quantityRanges[item.quantityRanges.length - 1].maxQuantity}개 주문가능
                      <br />
                      {item.quantityRanges[0].daysBeforeOrder}~{item.quantityRanges[item.quantityRanges.length - 1].daysBeforeOrder}일 전 주문 가능
                    </div>
                  )}

                  <div className={styles.badgeContainerDesktop}>
                    <div className={styles.badgeRow}>
                      {item.additionalSettings?.map((setting, index) => (
                        <span key={index} className={styles.settingBadge}>{setting}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.imageWrapper}>
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={`${item.images[0]}?width=140&height=140`}
                      alt={item.name}
                      className={styles.image}
                    />
                  ) : (
                    <div className={styles.placeholderImage}>
                      <span>이미지 없음</span>
                    </div>
                  )}
                </div>

                <div className={styles.badgeContainerMobile}>
                  <div className={styles.badgeRow}>
                    {item.additionalSettings?.map((setting, index) => (
                      <span key={index} className={styles.settingBadge}>{setting}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.menuFooter}>
                <div className={styles.toggleArea}>
                  {item.status !== 'pending' && (
                    <button
                      className={styles.toggleSwitch}
                      onClick={() => toggleAvailability(item)}
                      aria-label={item.status === 'active' ? '숨김 처리' : '판매 재개'}
                    >
                      <Image
                        src={item.status === 'active' ? '/icons/toggle-on.svg' : '/icons/toggle-off.svg'}
                        alt={item.status === 'active' ? '판매중' : '숨김'}
                        width={41}
                        height={25}
                      />
                    </button>
                  )}
                </div>
                <div className={styles.menuActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleDeleteMenu(item.id)}
                  >
                    상품삭제
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => setPreviewProduct(item)}
                  >
                    미리보기
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => router.push(`/partner/product/edit/${item.id}`)}
                  >
                    상품수정
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 미리보기 모달 */}
      {previewProduct && (
        <ProductPreviewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </div>
  )
}