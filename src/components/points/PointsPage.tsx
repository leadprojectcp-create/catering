'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, getDocs, where, doc, getDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import Image from 'next/image'
import styles from './PointsPage.module.css'

interface PointHistory {
  id: string
  type: 'earned' | 'used' | 'expired'
  amount: number
  reason: string
  createdAt: Timestamp
  orderId?: string
  productId?: string
  productName?: string
  reviewId?: string
  uid: string
}

type FilterType = 'all' | 'earned' | 'used' | 'expired'
type PeriodType = 'all' | '1month' | '2months' | '3months'

export default function PointsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [filter, setFilter] = useState<FilterType>('all')
  const [period, setPeriod] = useState<PeriodType>('all')
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      try {
        // users 컬렉션에서 현재 포인트 가져오기
        const userDocRef = doc(db, 'users', user.uid)
        const userDocSnap = await getDoc(userDocRef)

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data()
          setCurrentBalance(userData.point || 0)
        }

        // 포인트 내역 조회 - 최상위 points 컬렉션에서 uid로 필터링
        const pointsRef = collection(db, 'points')
        const q = query(
          pointsRef,
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(q)

        const history: PointHistory[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          history.push({
            id: doc.id,
            ...data,
          } as PointHistory)
        })

        setPointHistory(history)
      } catch (error) {
        console.error('포인트 내역 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  // 기간별 필터 텍스트
  const getPeriodText = (periodType: PeriodType) => {
    switch (periodType) {
      case 'all': return '전체기간'
      case '1month': return '1개월'
      case '2months': return '2개월'
      case '3months': return '3개월'
      default: return '전체기간'
    }
  }

  // 필터링된 포인트 내역
  const filteredHistory = pointHistory.filter((item) => {
    // 타입 필터
    let typeMatch = true
    if (filter === 'earned') typeMatch = item.type === 'earned'
    else if (filter === 'used') typeMatch = item.type === 'used'
    else if (filter === 'expired') typeMatch = item.type === 'expired'

    // 기간 필터
    let periodMatch = true
    if (period !== 'all') {
      const now = new Date()
      const itemDate = item.createdAt.toDate()
      const monthsAgo = period === '1month' ? 1 : period === '2months' ? 2 : 3
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate())
      periodMatch = itemDate >= startDate
    }

    return typeMatch && periodMatch
  })

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>보유 포인트</h1>
        <div className={styles.balanceAmount}>{currentBalance.toLocaleString()}P</div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.historySection}>
        {/* 필터 버튼 */}
        <div className={styles.filterContainer}>
          <button
            className={filter === 'all' ? styles.filterButtonActive : styles.filterButton}
            onClick={() => setFilter('all')}
          >
            전체
          </button>
          <button
            className={filter === 'earned' ? styles.filterButtonActive : styles.filterButton}
            onClick={() => setFilter('earned')}
          >
            적립
          </button>
          <button
            className={filter === 'used' ? styles.filterButtonActive : styles.filterButton}
            onClick={() => setFilter('used')}
          >
            사용
          </button>
          <button
            className={filter === 'expired' ? styles.filterButtonActive : styles.filterButton}
            onClick={() => setFilter('expired')}
          >
            소멸
          </button>

          {/* 기간별 필터 드롭다운 */}
          <div className={styles.periodDropdownContainer}>
            <button
              className={styles.periodButton}
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            >
              {getPeriodText(period)}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showPeriodDropdown && (
              <div className={styles.periodDropdown}>
                <button
                  className={`${styles.periodOption} ${period === 'all' ? styles.periodOptionActive : ''}`}
                  onClick={() => {
                    setPeriod('all')
                    setShowPeriodDropdown(false)
                  }}
                >
                  전체기간
                </button>
                <button
                  className={`${styles.periodOption} ${period === '1month' ? styles.periodOptionActive : ''}`}
                  onClick={() => {
                    setPeriod('1month')
                    setShowPeriodDropdown(false)
                  }}
                >
                  1개월
                </button>
                <button
                  className={`${styles.periodOption} ${period === '2months' ? styles.periodOptionActive : ''}`}
                  onClick={() => {
                    setPeriod('2months')
                    setShowPeriodDropdown(false)
                  }}
                >
                  2개월
                </button>
                <button
                  className={`${styles.periodOption} ${period === '3months' ? styles.periodOptionActive : ''}`}
                  onClick={() => {
                    setPeriod('3months')
                    setShowPeriodDropdown(false)
                  }}
                >
                  3개월
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 포인트 안내사항 버튼 */}
        <button className={styles.infoButton} onClick={() => setShowInfoModal(true)}>
          <span className={styles.infoButtonText}>포인트 안내사항</span>
          <Image src="/icons/arrow.svg" alt="화살표" width={20} height={20} />
        </button>

        {filteredHistory.length === 0 ? (
          <div className={styles.emptyState}>포인트 내역이 없습니다</div>
        ) : (
          <div className={styles.historyList}>
            {filteredHistory.map((item) => {
              // 타입에 따른 아이콘 결정
              let iconSrc = '/icons/earn.png'
              if (item.type === 'used') {
                iconSrc = '/icons/use.png'
              } else if (item.type === 'expired') {
                iconSrc = '/icons/extinction.png'
              }

              return (
                <div key={item.id} className={styles.historyItem}>
                  <Image
                    src={iconSrc}
                    alt={item.type}
                    width={40}
                    height={40}
                    className={styles.historyIcon}
                  />
                  <div className={styles.historyLeft}>
                    <div className={styles.historyDescription}>{item.reason}</div>
                    {item.productName && (
                      <div className={styles.productName}>{item.productName}</div>
                    )}
                    <div className={styles.historyDate}>
                      {formatDate(item.createdAt)} {formatTime(item.createdAt)}
                    </div>
                  </div>
                  <div className={styles.historyRight}>
                    <div
                      className={`${styles.historyAmount} ${
                        item.type === 'earned'
                          ? styles.earn
                          : item.type === 'expired'
                            ? styles.expired
                            : styles.use
                      }`}
                    >
                      {item.amount > 0 ? '+' : ''}
                      {item.amount.toLocaleString()}P
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 포인트 안내사항 모달 */}
      {showInfoModal && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowInfoModal(false)}></div>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>포인트 안내사항</h2>
              <button className={styles.modalCloseButton} onClick={() => setShowInfoModal(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalContent}>
              <p className={styles.modalDescription}>
                단모 포인트는 상품 구매 및 이벤트 참여 등을 통해 적립되며, 다양한 결제에 사용할 수 있는 회원전용 혜택 포인트입니다. 아래의 기준에 따라 포인트가 적립되고, 사용 및 소멸됩니다.
              </p>

              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>포인트 적립</h3>
                <ul className={styles.modalList}>
                  <li>상품 구매 시, 결제 금액에 따라 일정 비율의 포인트가 자동 적립됩니다.</li>
                  <li>이벤트, 리뷰 작성, 친구 초대 등 다양한 활동을 통해 추가 포인트가 제공됩니다.</li>
                  <li>배송 완료 후 일정 기간이 지난 후 적립 포인트가 확정됩니다.</li>
                </ul>
              </div>

              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>포인트 사용</h3>
                <ul className={styles.modalList}>
                  <li>상품 결제 시, 보유한 포인트를 전액 사용할 수 있습니다.</li>
                  <li>포인트 사용 가능 여부 및 최대 사용 가능 금액은 결제 페이지에서 확인하실 수 있습니다.</li>
                  <li>일부 할인상품 또는 프로모션 상품에는 포인트 사용이 제한될 수 있습니다.</li>
                </ul>
              </div>

              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>포인트 소멸</h3>
                <ul className={styles.modalList}>
                  <li>적립된 포인트는 적립일로부터 1년 후 자동 소멸됩니다.</li>
                  <li>소멸 예정 포인트는 메뉴 &gt; 내 포인트에서 확인하실 수 있습니다.</li>
                  <li>유효기간이 지난 포인트는 복구되지 않으니, 유효기간 내 사용을 권장드립니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
