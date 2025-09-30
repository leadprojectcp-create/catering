'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './MenuManagement.module.css'
import { db, auth } from '@/lib/firebase'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  description: string
  image?: string
  status: 'active' | 'inactive' | 'pending'
  partnerId: string
  createdAt: Date
  updatedAt: Date
}

export default function MenuManagement() {
  const router = useRouter()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    image: ''
  })

  // 파트너 ID 가져오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setPartnerId(user.uid)
      }
    })
    return () => unsubscribe()
  }, [])

  // 메뉴 목록 가져오기
  useEffect(() => {
    if (partnerId) {
      fetchMenuItems()
    }
  }, [partnerId])

  const fetchMenuItems = async () => {
    if (!partnerId) return

    try {
      const q = query(collection(db, 'products'), where('partnerId', '==', partnerId))
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
      console.error('메뉴 목록 가져오기 실패:', error)
      setLoading(false)
    }
  }

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

  // 메뉴 추가
  const handleAddMenu = async () => {
    if (!partnerId) return

    try {
      await addDoc(collection(db, 'products'), {
        ...formData,
        price: Number(formData.price),
        partnerId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      setIsAddModalOpen(false)
      resetForm()
      fetchMenuItems()
      alert('메뉴가 추가되었습니다.')
    } catch (error) {
      console.error('메뉴 추가 실패:', error)
      alert('메뉴 추가에 실패했습니다.')
    }
  }

  // 메뉴 수정
  const handleEditMenu = async () => {
    if (!selectedItem) return

    try {
      await updateDoc(doc(db, 'products', selectedItem.id), {
        ...formData,
        price: Number(formData.price),
        updatedAt: new Date()
      })

      setIsEditModalOpen(false)
      resetForm()
      fetchMenuItems()
      alert('메뉴가 수정되었습니다.')
    } catch (error) {
      console.error('메뉴 수정 실패:', error)
      alert('메뉴 수정에 실패했습니다.')
    }
  }

  // 메뉴 삭제
  const handleDeleteMenu = async (itemId: string) => {
    if (confirm('정말 이 메뉴를 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'products', itemId))
        fetchMenuItems()
        alert('메뉴가 삭제되었습니다.')
      } catch (error) {
        console.error('메뉴 삭제 실패:', error)
        alert('메뉴 삭제에 실패했습니다.')
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

  // 편집 모달 열기
  const openEditModal = (item: MenuItem) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      description: item.description,
      image: item.image || ''
    })
    setIsEditModalOpen(true)
  }

  // 폼 리셋
  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      description: '',
      image: ''
    })
    setSelectedItem(null)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>메뉴 목록을 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>메뉴 관리</h1>
        <p className={styles.subtitle}>
          메뉴 관리 페이지에서 새로운 메뉴를 등록하거나 기존 메뉴를 수정할 수 있습니다. 가격, 사진, 설명 등을 자유롭게 변경하고, 판매 상태를 설정해 고객에게 최신 정보를 제공해주세요.
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
              품절
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
            onClick={() => router.push('/partner/add-product')}
          >
            + 메뉴 추가
          </button>
        </div>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="상품명으로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.menuGrid}>
        {filteredItems.length === 0 ? (
          <div className={styles.emptyState}>
            <p>등록된 메뉴가 없습니다.</p>
            <p>새로운 메뉴를 추가해주세요.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className={styles.menuCard}>
              {item.image && (
                <img src={item.image} alt={item.name} className={styles.menuImage} />
              )}
              <div className={styles.menuInfo}>
                <h3 className={styles.menuName}>{item.name}</h3>
                <p className={styles.menuCategory}>{item.category}</p>
                <p className={styles.menuDescription}>{item.description}</p>
                <p className={styles.menuPrice}>{item.price.toLocaleString()}원</p>
                <div className={styles.menuStatus}>
                  <span className={
                    item.status === 'active' ? styles.available :
                    item.status === 'inactive' ? styles.soldOut :
                    styles.pending
                  }>
                    {item.status === 'active' ? '판매중' :
                     item.status === 'inactive' ? '품절' :
                     '심사중'}
                  </span>
                </div>
              </div>
              <div className={styles.menuActions}>
                <button
                  className={styles.toggleButton}
                  onClick={() => toggleAvailability(item)}
                >
                  {item.status === 'active' ? '품절 처리' : '판매 재개'}
                </button>
                <button
                  className={styles.editButton}
                  onClick={() => openEditModal(item)}
                >
                  수정
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteMenu(item.id)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 메뉴 추가 모달 */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>메뉴 추가</h2>
            <div className={styles.form}>
              <input
                type="text"
                placeholder="메뉴명"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={styles.input}
              />
              <input
                type="text"
                placeholder="카테고리"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className={styles.input}
              />
              <input
                type="number"
                placeholder="가격"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className={styles.input}
              />
              <textarea
                placeholder="설명"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className={styles.textarea}
              />
              <input
                type="url"
                placeholder="이미지 URL (선택)"
                value={formData.image}
                onChange={(e) => setFormData({...formData, image: e.target.value})}
                className={styles.input}
              />
              <div className={styles.modalButtons}>
                <button onClick={handleAddMenu} className={styles.submitButton}>
                  추가
                </button>
                <button onClick={() => {setIsAddModalOpen(false); resetForm()}} className={styles.cancelButton}>
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 수정 모달 */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>메뉴 수정</h2>
            <div className={styles.form}>
              <input
                type="text"
                placeholder="메뉴명"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={styles.input}
              />
              <input
                type="text"
                placeholder="카테고리"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className={styles.input}
              />
              <input
                type="number"
                placeholder="가격"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className={styles.input}
              />
              <textarea
                placeholder="설명"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className={styles.textarea}
              />
              <input
                type="url"
                placeholder="이미지 URL (선택)"
                value={formData.image}
                onChange={(e) => setFormData({...formData, image: e.target.value})}
                className={styles.input}
              />
              <div className={styles.modalButtons}>
                <button onClick={handleEditMenu} className={styles.submitButton}>
                  수정
                </button>
                <button onClick={() => {setIsEditModalOpen(false); resetForm()}} className={styles.cancelButton}>
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}