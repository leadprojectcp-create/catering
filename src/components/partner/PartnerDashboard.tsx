'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getPublishedNotices, Notice } from '@/lib/services/noticeService'
import Loading from '@/components/Loading'
import { ShoppingBag, Star, TrendingUp, Clock, AlertCircle, DollarSign, Package, MessageSquare, MessageCircle, HelpCircle, Bell } from 'lucide-react'
import styles from './PartnerDashboard.module.css'

interface Order {
  id: string
  orderNumber?: string
  orderer?: string
  customerName?: string
  totalPrice?: number
  totalAmount?: number
  orderStatus?: string
  createdAt?: unknown
}

interface Review {
  id: string
  userName?: string
  rating?: number
  content?: string
  createdAt?: unknown
}

interface DashboardStats {
  todayOrders: number
  pendingOrders: number
  newOrders: number // 신규 주문 (orderStatus: pending)
  newChats: number // 신규 채팅 문의
  todaySales: number
  monthSales: number
  monthSettlement: number // 이번 달 정산예정 금액
  newReviews: number
  avgRating: number
  totalProducts: number
  activeProducts: number
  recentOrders: Order[]
  recentReviews: Review[]
}

export default function PartnerDashboard() {
  const { userData, user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    pendingOrders: 0,
    newOrders: 0,
    newChats: 0,
    todaySales: 0,
    monthSales: 0,
    monthSettlement: 0,
    newReviews: 0,
    avgRating: 0,
    totalProducts: 0,
    activeProducts: 0,
    recentOrders: [],
    recentReviews: []
  })
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
      fetchNotices()
    } else {
      setLoading(false)
    }
  }, [user, userData])

  const fetchNotices = async () => {
    try {
      const partnerNotices = await getPublishedNotices('partner')
      setNotices(partnerNotices.slice(0, 10)) // 최근 10개
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
    }
  }

  // 공지사항 슬라이드 자동 전환 (위아래)
  useEffect(() => {
    if (notices.length <= 1) return

    const interval = setInterval(() => {
      setCurrentNoticeIndex((prev) => (prev + 1) % notices.length)
    }, 3000) // 3초마다 전환

    return () => clearInterval(interval)
  }, [notices.length])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const storeId = user?.uid // 파트너의 uid가 곧 storeId

      console.log('=== 파트너 대시보드 디버깅 ===')
      console.log('User UID:', user?.uid)
      console.log('UserData:', userData)
      console.log('Store ID:', storeId)

      if (!storeId) {
        console.error('storeId가 없습니다!')
        return
      }

      // 현재 시간
      const now = new Date()

      // 24시간 전
      const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000))
      const last24HoursTimestamp = Timestamp.fromDate(last24Hours)

      // 이번 달 시작일
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthStartTimestamp = Timestamp.fromDate(monthStart)

      // 각 데이터를 개별적으로 가져오기 (오류 방지)
      let todayOrdersSnapshot, pendingOrdersSnapshot, newOrdersSnapshot, monthOrdersSnapshot,
          recentOrdersSnapshot, recentReviewsSnapshot, productsSnapshot;

      try {
        // 모든 주문을 가져와서 클라이언트에서 필터링 (인덱스 불필요)
        const allOrdersSnapshot = await getDocs(query(
          collection(db, 'orders'),
          where('storeId', '==', storeId)
        ))

        // 24시간 이내 주문 필터링 (paymentStatus가 paid인 것만)
        const last24HoursTime = last24HoursTimestamp.toMillis()
        todayOrdersSnapshot = {
          size: allOrdersSnapshot.docs.filter(doc => {
            const data = doc.data()
            const createdAt = data.createdAt
            const createdTime = createdAt?.toMillis ? createdAt.toMillis() : 0
            return createdTime >= last24HoursTime && data.paymentStatus === 'paid'
          }).length,
          docs: allOrdersSnapshot.docs.filter(doc => {
            const data = doc.data()
            const createdAt = data.createdAt
            const createdTime = createdAt?.toMillis ? createdAt.toMillis() : 0
            return createdTime >= last24HoursTime && data.paymentStatus === 'paid'
          })
        }
        console.log('24시간 이내 주문:', todayOrdersSnapshot.size)
      } catch (error) {
        console.log('24시간 이내 주문 조회 실패:', error)
        todayOrdersSnapshot = { size: 0, docs: [] }
      }

      try {
        // 대기 중 주문 (기존 방식 - 호환성 유지)
        pendingOrdersSnapshot = await getDocs(query(
          collection(db, 'orders'),
          where('storeId', '==', storeId),
          where('paymentStatus', 'in', ['unpaid', 'paid'])
        ))
      } catch (error) {
        console.log('대기 주문 조회 실패:', error)
        pendingOrdersSnapshot = { size: 0, docs: [] }
      }

      try {
        // 신규 주문 (orderStatus가 pending이고 paymentStatus가 paid인 것만)
        const allOrdersSnapshot = await getDocs(query(
          collection(db, 'orders'),
          where('storeId', '==', storeId)
        ))

        newOrdersSnapshot = {
          size: allOrdersSnapshot.docs.filter(doc => {
            const data = doc.data()
            return data.orderStatus === 'pending' && data.paymentStatus === 'paid'
          }).length,
          docs: allOrdersSnapshot.docs.filter(doc => {
            const data = doc.data()
            return data.orderStatus === 'pending' && data.paymentStatus === 'paid'
          })
        }
        console.log('신규 주문:', newOrdersSnapshot.size)
        console.log('신규 주문 데이터:', newOrdersSnapshot.docs.map(d => d.data()))
      } catch (error) {
        console.log('신규 주문 조회 실패:', error)
        newOrdersSnapshot = { size: 0, docs: [] }
      }

      try {
        // 이번 달 주문 (이미 가져온 모든 주문에서 필터링)
        const allOrdersSnapshot = await getDocs(query(
          collection(db, 'orders'),
          where('storeId', '==', storeId)
        ))

        const monthStartTime = monthStartTimestamp.toMillis()
        monthOrdersSnapshot = {
          size: allOrdersSnapshot.docs.filter(doc => {
            const createdAt = doc.data().createdAt
            const createdTime = createdAt?.toMillis ? createdAt.toMillis() : 0
            return createdTime >= monthStartTime
          }).length,
          docs: allOrdersSnapshot.docs.filter(doc => {
            const createdAt = doc.data().createdAt
            const createdTime = createdAt?.toMillis ? createdAt.toMillis() : 0
            return createdTime >= monthStartTime
          })
        }
      } catch (error) {
        console.log('이번 달 주문 조회 실패:', error)
        monthOrdersSnapshot = { size: 0, docs: [] }
      }

      try {
        // 최근 주문 5개 (paymentStatus가 paid인 것만)
        const allOrdersSnapshot = await getDocs(query(
          collection(db, 'orders'),
          where('storeId', '==', storeId)
        ))

        const sortedDocs = allOrdersSnapshot.docs
          .filter(doc => doc.data().paymentStatus === 'paid')
          .sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : 0
            const bTime = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : 0
            return bTime - aTime // 내림차순
          }).slice(0, 5)

        recentOrdersSnapshot = { docs: sortedDocs }
      } catch (error) {
        console.log('최근 주문 조회 실패:', error)
        recentOrdersSnapshot = { docs: [] }
      }

      try {
        // 최근 리뷰 5개
        recentReviewsSnapshot = await getDocs(query(
          collection(db, 'reviews'),
          where('storeId', '==', storeId),
          orderBy('createdAt', 'desc'),
          limit(5)
        ))
      } catch (error) {
        console.log('최근 리뷰 조회 실패:', error)
        recentReviewsSnapshot = { docs: [] }
      }

      try {
        // 상품 목록
        productsSnapshot = await getDocs(query(
          collection(db, 'products'),
          where('storeId', '==', storeId)
        ))
      } catch (error) {
        console.log('상품 조회 실패:', error)
        productsSnapshot = { size: 0, docs: [] }
      }

      // 24시간 이내 매출 계산
      let todaySales = 0
      todayOrdersSnapshot.docs.forEach(doc => {
        const order = doc.data()
        if (order.totalPrice) todaySales += order.totalPrice
        else if (order.totalAmount) todaySales += order.totalAmount
      })

      // 이번 달 매출 계산 (orderStatus: delivered, paymentStatus: paid인 주문만)
      let monthSales = 0
      monthOrdersSnapshot.docs.forEach(doc => {
        const order = doc.data()
        if (order.orderStatus === 'delivered' && order.paymentStatus === 'paid') {
          if (order.totalPrice) monthSales += order.totalPrice
          else if (order.totalAmount) monthSales += order.totalAmount
        }
      })

      // 평균 별점 계산
      let totalRating = 0
      let reviewCount = 0
      recentReviewsSnapshot.docs.forEach(doc => {
        const review = doc.data()
        if (review.rating) {
          totalRating += review.rating
          reviewCount++
        }
      })

      // 활성 상품 수 계산
      let activeProducts = 0
      productsSnapshot.docs.forEach(doc => {
        const product = doc.data()
        if (product.status === 'active') activeProducts++
      })

      // 이번 달 정산 예정 금액 계산
      // SettlementPage와 동일한 로직: partnerId로 조회, completed & paid 주문
      // 정산 로직: 1-5건 3.4%, 6건 이상 13.4% 수수료
      let monthSettlement = 0

      try {
        // partnerId로 완료된 주문 조회
        const settlementOrdersQuery = query(
          collection(db, 'orders'),
          where('partnerId', '==', storeId),
          where('orderStatus', '==', 'completed'),
          where('paymentStatus', '==', 'paid')
        )
        const settlementSnapshot = await getDocs(settlementOrdersQuery)

        // createdAt 기준으로 정렬
        const sortedOrders = settlementSnapshot.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : 0
          const bTime = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : 0
          return aTime - bTime // 오래된 순서 (오름차순)
        })

        // 이번 달 주문만 필터링
        const monthStartTime = monthStartTimestamp.toMillis()
        const monthCompletedOrders = sortedOrders.filter(doc => {
          const createdAt = doc.data().createdAt
          const createdTime = createdAt?.toMillis ? createdAt.toMillis() : 0
          return createdTime >= monthStartTime
        })

        // 정산 금액 계산
        monthCompletedOrders.forEach((doc, index) => {
          const order = doc.data()
          const orderNumber = index + 1
          const totalProductPrice = order.totalProductPrice || 0
          const feeRate = orderNumber <= 5 ? 0.034 : 0.134
          const fee = totalProductPrice * feeRate
          const settlementAmount = totalProductPrice - fee
          monthSettlement += settlementAmount
        })
      } catch (error) {
        console.log('정산 금액 계산 실패:', error)
        monthSettlement = 0
      }

      setStats({
        todayOrders: todayOrdersSnapshot?.size || 0,
        pendingOrders: pendingOrdersSnapshot?.size || 0,
        newOrders: newOrdersSnapshot?.size || 0,
        newChats: 0,
        todaySales,
        monthSales,
        monthSettlement,
        newReviews: recentReviewsSnapshot?.docs?.length || 0,
        avgRating: reviewCount > 0 ? totalRating / reviewCount : 0,
        totalProducts: productsSnapshot?.size || 0,
        activeProducts,
        recentOrders: recentOrdersSnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) || [],
        recentReviews: recentReviewsSnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) || []
      })
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num)
  }

  const formatDate = (date: unknown) => {
    if (!date) return ''
    const d = (date as { toDate?: () => Date })?.toDate ? (date as { toDate: () => Date }).toDate() : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatNoticeDate = (date: unknown) => {
    if (!date) return ''
    const d = (date as { toDate?: () => Date })?.toDate ? (date as { toDate: () => Date }).toDate() : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <div className={styles.container}>
        <div className={styles.header}>
          {user && (
            <>
              <h1 className={styles.welcomeTitle}>
                {userData?.companyName || userData?.name}님, 환영합니다!
              </h1>
              <p className={styles.settlementInfo}>
                이번달 정산예정 금액은 <span className={styles.settlementAmount}>{formatNumber(stats.monthSettlement)}원</span> 입니다.
              </p>
            </>
          )}
        </div>

        {loading ? (
          <Loading />
        ) : (
          <>
            {/* 공지사항 슬라이드 (위아래) */}
            {notices.length > 0 && (
              <div className={styles.noticeSliderWrapper}>
                <div className={styles.noticeSliderContainer}>
                  {notices.map((notice, index) => (
                    <a
                      key={notice.id}
                      href={`/notice/${notice.id}`}
                      className={`${styles.noticeSliderItem} ${
                        index === currentNoticeIndex ? styles.noticeSliderItemActive : ''
                      }`}
                      style={{
                        transform: `translateY(${(index - currentNoticeIndex) * 100}%)`
                      }}
                    >
                      <span className={styles.noticeBadge}>공지사항</span>
                      <span className={styles.noticeSliderTitle}>
                        {notice.title}
                      </span>
                      <div className={styles.noticeSliderRight}>
                        <span className={styles.noticeSliderDate}>
                          {formatNoticeDate(notice.publishedAt)}
                        </span>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M7.5 5L12.5 10L7.5 15" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 주요 통계 카드 */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <a href="/partner/order/history?filter=pending" className={styles.statCardLink}>
                  <h3 className={styles.statLabel}>신규 주문요청</h3>
                  <span className={styles.statDescription}>
                    최근 주문 {stats.recentOrders.length > 0 && formatDate(stats.recentOrders[0].createdAt)}
                  </span>
                  <div className={styles.statCardBottom}>
                    <p className={styles.statValue}>{stats.newOrders}건</p>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 6L15 12L9 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </a>
              </div>

              <div className={styles.statCard}>
                <a href="/chat" className={styles.statCardLink}>
                  <h3 className={styles.statLabel}>신규 채팅문의</h3>
                  <span className={styles.statDescription}>
                    미답변 {stats.newChats}건
                  </span>
                  <div className={styles.statCardBottom}>
                    <p className={styles.statValue}>{stats.newChats}건</p>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 6L15 12L9 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </a>
              </div>

              <div className={styles.statCard}>
                <a href="/partner/reviews" className={styles.statCardLink}>
                  <h3 className={styles.statLabel}>평균 별점</h3>
                  <span className={styles.statDescription}>
                    새로 등록된 리뷰 {stats.newReviews}개
                  </span>
                  <div className={styles.statCardBottom}>
                    <p className={styles.statValue}>{stats.avgRating.toFixed(1)}/5</p>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 6L15 12L9 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
  )
}