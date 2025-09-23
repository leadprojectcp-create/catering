'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Image from 'next/image'
import { logPhoneCall, logWebsiteVisit } from '@/lib/logger'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import styles from './RestaurantList.module.css'

interface Restaurant {
  id: string
  name: string
  category: string
  location: string
  phone: string
  website?: string
  imageUrl?: string
  businessHours?: string
  createdAt?: { toDate?: () => Date } | Date | string
  updatedAt?: { toDate?: () => Date } | Date | string
}

interface RestaurantListProps {
  selectedCategory: string
}

export default function RestaurantList({ selectedCategory }: RestaurantListProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const { userData } = useAuth()
  const router = useRouter()

  // 레벨 10 사용자(관리자) 확인
  const isAdmin = userData?.level === 10

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'restaurants'))
        const restaurantData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Restaurant[]

        // 배열을 랜덤하게 섞기
        const shuffledRestaurants = restaurantData.sort(() => Math.random() - 0.5)
        setRestaurants(shuffledRestaurants)
      } catch (error) {
        console.error('레스토랑 데이터 가져오기 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRestaurants()
  }, [])

  const filteredRestaurants = selectedCategory === '전체'
    ? restaurants
    : restaurants.filter(restaurant => restaurant.category === selectedCategory)

  const handlePhoneCall = async (restaurant: Restaurant) => {
    await logPhoneCall(restaurant.id, restaurant.name, restaurant.phone)
    window.open(`tel:${restaurant.phone}`, '_self')
  }

  const handleWebsiteVisit = async (restaurant: Restaurant) => {
    if (restaurant.website) {
      await logWebsiteVisit(restaurant.id, restaurant.name, restaurant.website)
      window.open(restaurant.website, '_blank', 'noopener,noreferrer')
    }
  }

  const handleEdit = (restaurant: Restaurant) => {
    router.push(`/edit-restaurant/${restaurant.id}`)
    setShowDropdown(null)
  }

  const handleDelete = async (restaurant: Restaurant) => {
    if (window.confirm(`"${restaurant.name}" 업체를 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, 'restaurants', restaurant.id))
        // 삭제 후 목록 새로고침
        setRestaurants(restaurants.filter(r => r.id !== restaurant.id))
        alert('업체가 삭제되었습니다.')
      } catch (error) {
        console.error('삭제 실패:', error)
        alert('삭제 중 오류가 발생했습니다.')
      }
    }
    setShowDropdown(null)
  }

  const toggleDropdown = (restaurantId: string) => {
    setShowDropdown(showDropdown === restaurantId ? null : restaurantId)
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
      </div>

      <div className={styles.grid}>
        {filteredRestaurants.length === 0 ? (
          <div className={styles.emptyState}>
            {selectedCategory === '전체' ? '등록된 업체가 없습니다.' : `${selectedCategory} 카테고리에 등록된 업체가 없습니다.`}
          </div>
        ) : (
          filteredRestaurants.map((restaurant) => (
            <div key={restaurant.id} className={styles.restaurantCard}>
              <div className={styles.cardContent}>
                {/* 왼쪽 이미지 - 180x180 */}
                <div className={styles.imageContainer}>
                  {restaurant.imageUrl ? (
                    <Image
                      src={restaurant.imageUrl}
                      alt={restaurant.name}
                      width={180}
                      height={180}
                      className={styles.restaurantImage}
                    />
                  ) : (
                    <div className={styles.placeholderImage}>
                      <span>🍽️</span>
                    </div>
                  )}
                </div>

                {/* 오른쪽 정보 */}
                <div className={styles.restaurantInfo}>
                  {/* 상단 정보를 모두 동일한 크기로 분배 */}
                  <div className={styles.infoContent}>
                    {/* 카테고리 + 관리자 메뉴 */}
                    <div className={styles.categoryRow}>
                      <p className={styles.category}>{restaurant.category}</p>
                      {/* 관리자용 점3개 메뉴 */}
                      {isAdmin && (
                        <div className={styles.adminMenu}>
                          <button
                            onClick={() => toggleDropdown(restaurant.id)}
                            className={styles.adminButton}
                          >
                            <span className={styles.adminButtonText}>⋯</span>
                          </button>

                          {showDropdown === restaurant.id && (
                            <div className={styles.dropdown}>
                              <button
                                onClick={() => handleEdit(restaurant)}
                                className={`${styles.dropdownButton} ${styles.editButton}`}
                              >
                                수정하기
                              </button>
                              <button
                                onClick={() => handleDelete(restaurant)}
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
                      <h3 className={styles.restaurantName}>{restaurant.name}</h3>
                    </div>

                    {/* 위치 */}
                    <div className={styles.locationRow}>
                      <p className={styles.locationInfo}>
                        <span className={styles.label}>위치 </span>
                        <span className={styles.locationText}>{restaurant.location}</span>
                      </p>
                    </div>

                    {/* 영업시간 */}
                    <div className={styles.hoursRow}>
                      {restaurant.businessHours ? (
                        <p className={styles.hoursInfo}>
                          <span className={styles.label}>영업 </span>
                          <span className={styles.hoursText}>{restaurant.businessHours}</span>
                        </p>
                      ) : (
                        <span></span>
                      )}
                    </div>
                  </div>

                  {/* PC에서 버튼을 restaurantInfo 내부에 배치 */}
                  <div className={`${styles.buttonContainer} ${styles.pcButtons}`}>
                    <button
                      onClick={() => handlePhoneCall(restaurant)}
                      className={`${styles.actionButton} ${styles.phoneButton}`}
                    >
                      전화하기
                    </button>
                    {restaurant.website && (
                      <button
                        onClick={() => handleWebsiteVisit(restaurant)}
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
                  onClick={() => handlePhoneCall(restaurant)}
                  className={`${styles.actionButton} ${styles.phoneButton}`}
                >
                  전화하기
                </button>
                {restaurant.website && (
                  <button
                    onClick={() => handleWebsiteVisit(restaurant)}
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