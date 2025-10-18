'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Loading from '@/components/Loading'
import { ShoppingBag, Star, TrendingUp, Clock, AlertCircle, DollarSign, Package, MessageSquare, MessageCircle } from 'lucide-react'
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
    newReviews: 0,
    avgRating: 0,
    totalProducts: 0,
    activeProducts: 0,
    recentOrders: [],
    recentReviews: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    } else {
      setLoading(false)
    }
  }, [user, userData])

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

      setStats({
        todayOrders: todayOrdersSnapshot?.size || 0,
        pendingOrders: pendingOrdersSnapshot?.size || 0,
        newOrders: newOrdersSnapshot?.size || 0,
        newChats: 0,
        todaySales,
        monthSales,
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

  return (
    <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>파트너 대시보드</h1>
          {user && (
            <p className={styles.welcome}>
              {userData?.companyName || userData?.name}님, 환영합니다!
            </p>
          )}
        </div>

        {loading ? (
          <Loading />
        ) : (
          <>
            {/* 주요 통계 카드 */}
            <div className={styles.statsGrid}>
              <a href="/partner/order/history?filter=pending" className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#fee2e2' }}>
                  <AlertCircle size={24} color="#ef4444" />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>신규 주문</h3>
                  <p className={styles.statValue}>{stats.newOrders}건</p>
                  <span className={styles.statDescription}>
                    승인 대기 중
                  </span>
                </div>
              </a>

              <a href="/partner/order/history" className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#fef3c7' }}>
                  <ShoppingBag size={24} color="#f59e0b" />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>24시간 주문</h3>
                  <p className={styles.statValue}>{stats.todayOrders}건</p>
                  <span className={styles.statDescription}>
                    최근 24시간 이내
                  </span>
                </div>
              </a>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#dbeafe' }}>
                  <DollarSign size={24} color="#3b82f6" />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>{new Date().getMonth() + 1}월 매출</h3>
                  <p className={styles.statValue}>{formatNumber(stats.monthSales)}원</p>
                  <span className={styles.statDescription}>
                    배송 완료 및 결제 완료된 주문
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#dcfce7' }}>
                  <MessageCircle size={24} color="#10b981" />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>신규 채팅 문의</h3>
                  <p className={styles.statValue}>{stats.newChats}건</p>
                  <span className={styles.statDescription}>
                    답변 대기 중
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#fce7f3' }}>
                  <Star size={24} color="#ec4899" />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>평균 별점</h3>
                  <p className={styles.statValue}>{stats.avgRating.toFixed(1)}</p>
                  <span className={styles.statDescription}>
                    신규 리뷰 {stats.newReviews}개
                  </span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: '#ede9fe' }}>
                  <Package size={24} color="#8b5cf6" />
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>등록 상품</h3>
                  <p className={styles.statValue}>{stats.totalProducts}개</p>
                  <span className={styles.statDescription}>
                    활성: {stats.activeProducts}개
                  </span>
                </div>
              </div>
            </div>

            {/* 최근 활동 */}
            <div className={styles.recentActivities}>
              {/* 최근 주문 */}
              <div className={styles.activitySection}>
                <h2 className={styles.sectionTitle}>
                  <Clock size={20} />
                  최근 주문
                </h2>
                <div className={styles.activityList}>
                  {stats.recentOrders.length === 0 ? (
                    <p className={styles.emptyMessage}>최근 주문이 없습니다</p>
                  ) : (
                    stats.recentOrders.map(order => (
                      <div key={order.id} className={styles.activityItem}>
                        <div className={styles.activityInfo}>
                          <p className={styles.activityTitle}>
                            {order.orderNumber || order.id.substring(0, 8)}
                          </p>
                          <p className={styles.activityDetail}>
                            {order.orderer || order.customerName} | {formatNumber(order.totalPrice || order.totalAmount || 0)}원
                          </p>
                          <span className={`${styles.orderStatus} ${styles[order.orderStatus || 'pending']}`}>
                            {order.orderStatus === 'pending' ? '승인 대기' :
                             order.orderStatus === 'accepted' ? '승인 완료' :
                             order.orderStatus === 'rejected' ? '거부' :
                             order.orderStatus === 'preparing' ? '준비 중' :
                             order.orderStatus === 'shipping' ? '배송 중' :
                             order.orderStatus === 'delivered' ? '배송 완료' :
                             order.orderStatus === 'cancelled' ? '취소' : '대기중'}
                          </span>
                        </div>
                        <span className={styles.activityTime}>
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 최근 리뷰 */}
              <div className={styles.activitySection}>
                <h2 className={styles.sectionTitle}>
                  <MessageSquare size={20} />
                  최근 리뷰
                </h2>
                <div className={styles.activityList}>
                  {stats.recentReviews.length === 0 ? (
                    <p className={styles.emptyMessage}>최근 리뷰가 없습니다</p>
                  ) : (
                    stats.recentReviews.map(review => (
                      <div key={review.id} className={styles.activityItem}>
                        <div className={styles.activityInfo}>
                          <div className={styles.reviewHeader}>
                            <p className={styles.activityTitle}>
                              {review.userName || '익명'}
                            </p>
                            <div className={styles.rating}>
                              {'★'.repeat(review.rating || 0)}{'☆'.repeat(5 - (review.rating || 0))}
                            </div>
                          </div>
                          <p className={styles.reviewContent}>
                            {review.content}
                          </p>
                        </div>
                        <span className={styles.activityTime}>
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 빠른 메뉴 */}
            <div className={styles.quickMenu}>
              <h2 className={styles.sectionTitle}>빠른 메뉴</h2>
              <div className={styles.quickMenuGrid}>
                <a href="/partner/order/history" className={styles.quickMenuItem}>
                  <ShoppingBag size={20} />
                  <span>주문 관리</span>
                </a>
                <a href="/partner/product/management" className={styles.quickMenuItem}>
                  <Package size={20} />
                  <span>상품 관리</span>
                </a>
                <a href="/partner/review/management" className={styles.quickMenuItem}>
                  <Star size={20} />
                  <span>리뷰 관리</span>
                </a>
                <a href="/partner/store/management" className={styles.quickMenuItem}>
                  <TrendingUp size={20} />
                  <span>가게 관리</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
  )
}