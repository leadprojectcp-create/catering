'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Timestamp, FieldValue } from 'firebase/firestore'
import Loading from '@/components/Loading'
import Image from 'next/image'
import styles from './StoreManagementPage.module.css'

interface Store {
  uid: string
  email: string
  name?: string
  phone?: string
  type?: 'partner' | 'user' | 'admin'
  businessName?: string
  businessNumber?: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
  businessImage?: string
  businessCategory?: string
  description?: string
  registrationComplete?: boolean
  status?: 'active' | 'inactive' | 'pending'
  createdAt?: Date | Timestamp | FieldValue
  lastLoginAt?: Date | Timestamp | FieldValue
  disabled?: boolean
}

export default function StoreManagementPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      const q = query(
        collection(db, 'users'),
        where('type', '==', 'partner'),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const storesData: Store[] = []

      querySnapshot.forEach((doc) => {
        storesData.push({
          uid: doc.id,
          ...doc.data() as Omit<Store, 'uid'>
        })
      })

      setStores(storesData)
    } catch (error) {
      console.error('업체 목록 로드 실패:', error)
      alert('업체 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (uid: string, newStatus: 'active' | 'inactive' | 'pending') => {
    if (!confirm(`이 업체의 상태를 ${getStatusLabel(newStatus)}(으)로 변경하시겠습니까?`)) {
      return
    }

    try {
      const storeRef = doc(db, 'users', uid)
      await updateDoc(storeRef, { status: newStatus })
      setStores(stores.map(s =>
        s.uid === uid ? { ...s, status: newStatus } : s
      ))
      alert('상태가 변경되었습니다.')
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const handleToggleDisabled = async (uid: string, currentDisabled: boolean) => {
    const newDisabled = !currentDisabled
    if (!confirm(`이 업체를 ${newDisabled ? '비활성화' : '활성화'}하시겠습니까?`)) {
      return
    }

    try {
      const storeRef = doc(db, 'users', uid)
      await updateDoc(storeRef, { disabled: newDisabled })
      setStores(stores.map(s =>
        s.uid === uid ? { ...s, disabled: newDisabled } : s
      ))
      alert(`업체가 ${newDisabled ? '비활성화' : '활성화'}되었습니다.`)
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return '활성'
      case 'inactive': return '비활성'
      case 'pending': return '대기'
      default: return '대기'
    }
  }

  const formatDate = (date: Date | Timestamp | FieldValue | undefined) => {
    if (!date) return '-'
    const d = typeof date === 'object' && 'toDate' in date ? (date as Timestamp).toDate() : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewDetail = (store: Store) => {
    setSelectedStore(store)
    setShowDetailModal(true)
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedStore(null)
  }

  const filteredStores = stores.filter(store => {
    if (filter === 'all') return true
    return store.status === filter
  })

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>업체 관리</h1>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 ({stores.length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
            onClick={() => setFilter('active')}
          >
            활성 ({stores.filter(s => s.status === 'active').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
            onClick={() => setFilter('pending')}
          >
            대기 ({stores.filter(s => s.status === 'pending' || !s.status).length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'inactive' ? styles.active : ''}`}
            onClick={() => setFilter('inactive')}
          >
            비활성 ({stores.filter(s => s.status === 'inactive').length})
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>이미지</th>
              <th>업체명</th>
              <th>대표자명</th>
              <th>이메일</th>
              <th>전화번호</th>
              <th>사업자번호</th>
              <th>카테고리</th>
              <th>등록일</th>
              <th>등록완료</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredStores.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.empty}>
                  업체가 없습니다.
                </td>
              </tr>
            ) : (
              filteredStores.map((store) => (
                <tr key={store.uid} className={store.disabled ? styles.disabledRow : ''}>
                  <td>
                    <div className={styles.storeImage}>
                      {store.businessImage ? (
                        <Image
                          src={store.businessImage}
                          alt={store.businessName || '업체'}
                          width={60}
                          height={60}
                          style={{ objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div className={styles.noImage}>이미지 없음</div>
                      )}
                    </div>
                  </td>
                  <td>{store.businessName || '-'}</td>
                  <td>{store.name || '-'}</td>
                  <td>{store.email}</td>
                  <td>{store.businessPhone || store.phone || '-'}</td>
                  <td>{store.businessNumber || '-'}</td>
                  <td>{store.businessCategory || '-'}</td>
                  <td>{formatDate(store.createdAt)}</td>
                  <td>
                    <span className={`${styles.badge} ${store.registrationComplete ? styles.badgeSuccess : styles.badgeWarning}`}>
                      {store.registrationComplete ? '완료' : '미완료'}
                    </span>
                  </td>
                  <td>
                    <select
                      className={styles.statusSelect}
                      value={store.status || 'pending'}
                      onChange={(e) => handleStatusChange(store.uid, e.target.value as 'active' | 'inactive' | 'pending')}
                    >
                      <option value="pending">대기</option>
                      <option value="active">활성</option>
                      <option value="inactive">비활성</option>
                    </select>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.detailBtn}
                        onClick={() => handleViewDetail(store)}
                      >
                        상세보기
                      </button>
                      <button
                        className={styles.toggleBtn}
                        onClick={() => handleToggleDisabled(store.uid, store.disabled || false)}
                      >
                        {store.disabled ? '활성화' : '비활성화'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 상세보기 모달 */}
      {showDetailModal && selectedStore && (
        <div className={styles.modalOverlay} onClick={closeDetailModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>업체 상세정보</h2>
              <button className={styles.closeBtn} onClick={closeDetailModal}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* 업체 이미지 */}
              {selectedStore.businessImage && (
                <div className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>업체 이미지</h3>
                  <div className={styles.imageContainer}>
                    <Image
                      src={selectedStore.businessImage}
                      alt={selectedStore.businessName || '업체'}
                      width={200}
                      height={200}
                      style={{ objectFit: 'cover', borderRadius: '8px' }}
                    />
                  </div>
                </div>
              )}

              {/* 기본 정보 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>기본 정보</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>업체명:</span>
                    <span className={styles.detailValue}>{selectedStore.businessName || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>대표자명:</span>
                    <span className={styles.detailValue}>{selectedStore.name || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>사업자번호:</span>
                    <span className={styles.detailValue}>{selectedStore.businessNumber || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>카테고리:</span>
                    <span className={styles.detailValue}>{selectedStore.businessCategory || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 연락처 정보 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>연락처 정보</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>업체 이메일:</span>
                    <span className={styles.detailValue}>{selectedStore.businessEmail || selectedStore.email}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>업체 전화번호:</span>
                    <span className={styles.detailValue}>{selectedStore.businessPhone || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>담당자 전화번호:</span>
                    <span className={styles.detailValue}>{selectedStore.phone || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>업체 주소:</span>
                    <span className={styles.detailValue}>{selectedStore.businessAddress || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 업체 설명 */}
              {selectedStore.description && (
                <div className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>업체 설명</h3>
                  <p className={styles.description}>{selectedStore.description}</p>
                </div>
              )}

              {/* 계정 정보 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>계정 정보</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>계정 이메일:</span>
                    <span className={styles.detailValue}>{selectedStore.email}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>가입일:</span>
                    <span className={styles.detailValue}>{formatDate(selectedStore.createdAt)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>마지막 로그인:</span>
                    <span className={styles.detailValue}>{formatDate(selectedStore.lastLoginAt)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>등록 완료 여부:</span>
                    <span className={styles.detailValue}>
                      <span className={`${styles.badge} ${selectedStore.registrationComplete ? styles.badgeSuccess : styles.badgeWarning}`}>
                        {selectedStore.registrationComplete ? '완료' : '미완료'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 상태 정보 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>상태 정보</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>운영 상태:</span>
                    <span className={styles.detailValue}>{getStatusLabel(selectedStore.status)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>계정 상태:</span>
                    <span className={styles.detailValue}>
                      <span className={`${styles.badge} ${selectedStore.disabled ? styles.badgeDanger : styles.badgeSuccess}`}>
                        {selectedStore.disabled ? '비활성' : '활성'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeModalBtn} onClick={closeDetailModal}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
