'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import { logPhoneCall, logWebsiteVisit } from '@/lib/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import styles from './StoreList.module.css'

interface Store {
  id: string
  companyName: string
  businessCategory: string
  businessAddress: string
  phone?: string
  website?: string
  imageUrl?: string
  businessHours?: string
  createdAt?: { toDate?: () => Date } | Date | string
  updatedAt?: { toDate?: () => Date } | Date | string
}

interface StoreListProps {
  selectedCategory: string
}

export default function StoreList({ selectedCategory }: StoreListProps) {
  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const { userData } = useAuth()
  const router = useRouter()

  // 레벨 10 사용자(관리자) 확인
  const isAdmin = userData?.level === 10

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const q = query(collection(db, 'users'), where('type', '==', 'partner'))
        const querySnapshot = await getDocs(q)
        const storeData = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            companyName: data.companyName,
            businessCategory: data.businessCategory,
            businessAddress: typeof data.businessAddress === 'object'
              ? data.businessAddress.fullAddress || `${data.businessAddress.city || ''} ${data.businessAddress.district || ''} ${data.businessAddress.dong || ''} ${data.businessAddress.detail || ''}`.trim()
              : data.businessAddress,
            phone: data.phone,
            website: data.website,
            imageUrl: data.imageUrl,
            businessHours: data.businessHours
          } as Store
        })

        // 랜덤 셔플
        const shuffledStores = storeData.sort(() => Math.random() - 0.5)
        setStores(shuffledStores)
      } catch (error) {
        console.error('파트너 데이터 가져오기 실패:', error)
        setStores([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchStores()
  }, [])

  const filteredStores = selectedCategory === '전체'
    ? stores
    : stores.filter(store => store.businessCategory === selectedCategory)

  const handlePhoneCall = async (store: Store) => {
    if (store.phone) {
      await logPhoneCall(store.id, store.companyName, store.phone)
      window.open(`tel:${store.phone}`, '_self')
    }
  }

  const handleWebsiteVisit = async (store: Store) => {
    if (store.website) {
      await logWebsiteVisit(store.id, store.companyName, store.website)
      window.open(store.website, '_blank', 'noopener,noreferrer')
    }
  }

  const handleEdit = (store: Store) => {
    router.push(`/edit-store/${store.id}`)
    setShowDropdown(null)
  }

  const handleDelete = async (store: Store) => {
    if (window.confirm(`"${store.companyName}" 업체를 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, 'users', store.id))
        setStores(stores.filter(r => r.id !== store.id))
        alert('업체가 삭제되었습니다.')
      } catch (error) {
        console.error('삭제 실패:', error)
        alert('삭제 중 오류가 발생했습니다.')
      }
    }
    setShowDropdown(null)
  }

  const toggleDropdown = (storeId: string) => {
    setShowDropdown(showDropdown === storeId ? null : storeId)
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {selectedCategory === '전체' ? '전체 목록' : `${selectedCategory} 목록`}
        </h2>
        <p className={styles.resultCount}>
          총 <span className={styles.countNumber}>{filteredStores.length}</span>개의 결과
        </p>
      </div>

      <div className={styles.grid}>
        {filteredStores.length === 0 ? (
          <div className={styles.emptyState}>
            {selectedCategory === '전체' ? '등록된 업체가 없습니다.' : `${selectedCategory} 카테고리에 등록된 업체가 없습니다.`}
          </div>
        ) : (
          filteredStores.map((store) => (
            <div key={store.id} className={styles.storeCard}>
              <div className={styles.cardContent}>
                {/* 왼쪽 이미지 - 180x180 */}
                <div className={styles.imageContainer}>
                  {store.imageUrl ? (
                    <Image
                      src={store.imageUrl}
                      alt={store.companyName}
                      width={180}
                      height={180}
                      className={styles.storeImage}
                    />
                  ) : (
                    <div className={styles.placeholderImage}>
                      <span>🍽️</span>
                    </div>
                  )}
                </div>

                {/* 오른쪽 정보 */}
                <div className={styles.storeInfo}>
                  {/* 상단 정보를 모두 동일한 크기로 분배 */}
                  <div className={styles.infoContent}>
                    {/* 카테고리 + 관리자 메뉴 */}
                    <div className={styles.categoryRow}>
                      <p className={styles.category}>{store.businessCategory}</p>
                      {/* 관리자용 점3개 메뉴 */}
                      {isAdmin && (
                        <div className={styles.adminMenu}>
                          <button
                            onClick={() => toggleDropdown(store.id)}
                            className={styles.adminButton}
                          >
                            <span className={styles.adminButtonText}>⋯</span>
                          </button>

                          {showDropdown === store.id && (
                            <div className={styles.dropdown}>
                              <button
                                onClick={() => handleEdit(store)}
                                className={`${styles.dropdownButton} ${styles.editButton}`}
                              >
                                수정하기
                              </button>
                              <button
                                onClick={() => handleDelete(store)}
                                className={`${styles.dropdownButton} ${styles.deleteButton}`}
                              >
                                삭제하기
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 가게명 */}
                    <div className={styles.nameRow}>
                      <h3 className={styles.storeName}>{store.companyName}</h3>
                    </div>

                    {/* 위치 */}
                    <div className={styles.locationRow}>
                      <p className={styles.locationInfo}>
                        <span className={styles.label}>위치 </span>
                        <span className={styles.locationText}>{store.businessAddress}</span>
                      </p>
                    </div>

                    {/* 영업시간 */}
                    <div className={styles.hoursRow}>
                      {store.businessHours ? (
                        <p className={styles.hoursInfo}>
                          <span className={styles.label}>영업 </span>
                          <span className={styles.hoursText}>{store.businessHours}</span>
                        </p>
                      ) : (
                        <span></span>
                      )}
                    </div>
                  </div>

                  {/* PC에서 버튼을 storeInfo 내부에 배치 */}
                  <div className={`${styles.buttonContainer} ${styles.pcButtons}`}>
                    <button
                      onClick={() => handlePhoneCall(store)}
                      className={`${styles.actionButton} ${styles.phoneButton}`}
                    >
                      전화하기
                    </button>
                    {store.website && (
                      <button
                        onClick={() => handleWebsiteVisit(store)}
                        className={`${styles.actionButton} ${styles.websiteButton}`}
                      >
                        웹사이트 방문
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 모바일에서 버튼을 카드 외부 하단에 배치 */}
              <div className={`${styles.buttonContainer} ${styles.mobileButtons}`}>
                <button
                  onClick={() => handlePhoneCall(store)}
                  className={`${styles.actionButton} ${styles.phoneButton}`}
                >
                  전화하기
                </button>
                {store.website && (
                  <button
                    onClick={() => handleWebsiteVisit(store)}
                    className={`${styles.actionButton} ${styles.websiteButton}`}
                  >
                    웹사이트 방문
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}