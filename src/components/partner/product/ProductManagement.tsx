'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import styles from './ProductManagement.module.css'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'

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
  deliveryMethods?: {
    self: boolean
    quick: boolean
    pickup: boolean
  }
  additionalSettings?: {
    sameDayDelivery: boolean
    thermalPack: boolean
    stickerCustom: boolean
  }
  discountedPrice?: number
  discount?: {
    type: 'amount' | 'percent'
    value: number
    startDate: string | null
    endDate: string | null
    isAlwaysActive: boolean
  }
}

export default function ProductManagement() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')

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
        await deleteDoc(doc(db, 'products', itemId))
        fetchMenuItems()
        alert('상품이 삭제되었습니다.')
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
        updatedAt: new Date()
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
              <div className={styles.menuTop}>
                <div className={styles.menuInfo}>
                  <div className={styles.menuHeader}>
                    <h3 className={`${styles.menuName} ${item.status === 'inactive' ? styles.inactiveMenuName : ''}`}>{item.name}</h3>
                    <span className={
                      item.status === 'active' ? styles.available :
                      item.status === 'inactive' ? styles.soldOut :
                      styles.pending
                    }>
                      {item.status === 'active' ? '판매중' :
                       item.status === 'inactive' ? '숨김' :
                       '심사중'}
                    </span>
                  </div>
                  <div className={styles.priceContainer}>
                    {item.discountedPrice ? (
                      <>
                        <span className={styles.originalPrice}>{item.price.toLocaleString()}원</span>
                        <span className={styles.discountRate}>{item.discount?.value}%</span>
                        <span className={styles.discountedPrice}>{item.discountedPrice.toLocaleString()}원</span>
                      </>
                    ) : (
                      <span className={styles.menuPrice}>{item.price.toLocaleString()}원</span>
                    )}
                  </div>
                  <div className={styles.menuCategory}>
                    {item.deliveryMethods?.self && <span className={styles.deliveryBadge}>자체 배송</span>}
                    {item.deliveryMethods?.quick && <span className={styles.deliveryBadge}>퀵업체 배송</span>}
                    {item.deliveryMethods?.pickup && <span className={styles.deliveryBadge}>매장 픽업</span>}
                    {item.additionalSettings?.sameDayDelivery && <span className={styles.settingBadge}>당일배송가능</span>}
                    {item.additionalSettings?.thermalPack && <span className={styles.settingBadge}>보온•냉팩 포장 가능</span>}
                    {item.additionalSettings?.stickerCustom && <span className={styles.settingBadge}>스티커 제작 가능</span>}
                  </div>
                </div>
                {item.images && item.images.length > 0 && (
                  <div className={styles.imageWrapper}>
                    <img
                      src={`${item.images[0]}?width=100&height=100`}
                      alt={item.name}
                      className={styles.menuImage}
                    />
                    {item.status === 'inactive' && (
                      <div className={styles.imageOverlay}>숨김</div>
                    )}
                  </div>
                )}
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
                    onClick={() => {/* TODO: 미리보기 */}}
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
    </div>
  )
}