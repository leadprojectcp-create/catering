'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Loading from '@/components/Loading'
import { ShoppingBag, Users, Store, TrendingUp, Activity, DollarSign, Package, AlertCircle } from 'lucide-react'
import styles from './AdminDashboard.module.css'

interface DashboardStats {
  totalOrders: number
  totalSales: number
  totalStores: number
  totalUsers: number
  todayOrders: number
  todaySales: number
  activeStores: number
  pendingOrders: number
  recentOrders: Order[]
  recentLogs: ActivityLog[]
}

interface Order {
  id: string
  orderNumber?: string
  storeName?: string
  customerName?: string
  totalPrice?: number
  totalAmount?: number
  orderStatus?: string
  createdAt?: unknown
}

interface ActivityLog {
  id: string
  restaurantName?: string
  actionType?: string
  timestamp?: unknown
}

export default function AdminDashboard() {
  const { userData, user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalSales: 0,
    totalStores: 0,
    totalUsers: 0,
    todayOrders: 0,
    todaySales: 0,
    activeStores: 0,
    pendingOrders: 0,
    recentOrders: [],
    recentLogs: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && userData?.level === 10) {
      fetchDashboardData()
    } else {
      setLoading(false)
    }
  }, [user, userData])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayStartTimestamp = Timestamp.fromDate(todayStart)

      // 전체 주문 조회
      const ordersSnapshot = await getDocs(collection(db, 'orders'))
      const allOrders = ordersSnapshot.docs

      // 오늘 주문 필터링
      const todayOrders = allOrders.filter(doc => {
        const createdAt = doc.data().createdAt
        const createdTime = createdAt?.toMillis ? createdAt.toMillis() : 0
        return createdTime >= todayStartTimestamp.toMillis()
      })

      // 대기 중 주문
      const pendingOrders = allOrders.filter(doc =>
        doc.data().orderStatus === 'pending'
      )

      // 전체 매출 계산 (배송 완료 & 결제 완료)
      let totalSales = 0
      allOrders.forEach(doc => {
        const order = doc.data()
        if (order.orderStatus === 'delivered' && order.paymentStatus === 'paid') {
          totalSales += order.totalPrice || order.totalAmount || 0
        }
      })

      // 오늘 매출 계산
      let todaySales = 0
      todayOrders.forEach(doc => {
        const order = doc.data()
        if (order.orderStatus === 'delivered' && order.paymentStatus === 'paid') {
          todaySales += order.totalPrice || order.totalAmount || 0
        }
      })

      // 최근 주문 5개
      const sortedOrders = allOrders
        .sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : 0
          const bTime = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : 0
          return bTime - aTime
        })
        .slice(0, 5)

      // 가게 조회
      const storesSnapshot = await getDocs(collection(db, 'users'))
      const stores = storesSnapshot.docs.filter(doc =>
        doc.data().role === 'partner' && doc.data().registrationComplete === true
      )
      const activeStores = stores.filter(doc =>
        doc.data().status === 'active'
      )

      // 사용자 조회
      const usersSnapshot = await getDocs(collection(db, 'users'))

      // 최근 활동 로그 조회
      let recentLogsSnapshot
      try {
        const logsQuery = query(
          collection(db, 'activity_logs'),
          orderBy('timestamp', 'desc'),
          limit(5)
        )
        recentLogsSnapshot = await getDocs(logsQuery)
      } catch (error) {
        console.log('활동 로그 조회 실패:', error)
        recentLogsSnapshot = { docs: [] }
      }

      setStats({
        totalOrders: allOrders.length,
        totalSales,
        totalStores: stores.length,
        totalUsers: usersSnapshot.size,
        todayOrders: todayOrders.length,
        todaySales,
        activeStores: activeStores.length,
        pendingOrders: pendingOrders.length,
        recentOrders: sortedOrders.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[],
        recentLogs: (recentLogsSnapshot?.docs || []).map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ActivityLog[]
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
    const d = (date as { toDate?: () => Date })?.toDate
      ? (date as { toDate: () => Date }).toDate()
      : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionText = (actionType?: string) => {
    switch (actionType) {
      case 'phone_call':
        return '전화하기'
      case 'website_visit':
        return '웹사이트 방문'
      default:
        return actionType || '-'
    }
  }

  if (loading) {
    return <Loading />
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>로그인이 필요합니다.</div>
      </div>
    )
  }

  if (userData?.level !== 10) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>관리자 권한이 필요합니다.</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>관리자 대시보드</h1>
        <p className={styles.welcome}>
          {userData?.name}님, 환영합니다!
        </p>
      </div>

      {/* 주요 통계 카드 */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fee2e2' }}>
            <AlertCircle size={24} color="#ef4444" />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>대기 중 주문</h3>
            <p className={styles.statValue}>{stats.pendingOrders}건</p>
            <span className={styles.statDescription}>
              승인 대기 중
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef3c7' }}>
            <ShoppingBag size={24} color="#f59e0b" />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>오늘 주문</h3>
            <p className={styles.statValue}>{stats.todayOrders}건</p>
            <span className={styles.statDescription}>
              전체: {stats.totalOrders}건
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dbeafe' }}>
            <DollarSign size={24} color="#3b82f6" />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>오늘 매출</h3>
            <p className={styles.statValue}>{formatNumber(stats.todaySales)}원</p>
            <span className={styles.statDescription}>
              전체: {formatNumber(stats.totalSales)}원
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dcfce7' }}>
            <Store size={24} color="#10b981" />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>파트너 가게</h3>
            <p className={styles.statValue}>{stats.totalStores}개</p>
            <span className={styles.statDescription}>
              활성: {stats.activeStores}개
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fce7f3' }}>
            <Users size={24} color="#ec4899" />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>전체 사용자</h3>
            <p className={styles.statValue}>{stats.totalUsers}명</p>
            <span className={styles.statDescription}>
              등록된 사용자
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#ede9fe' }}>
            <TrendingUp size={24} color="#8b5cf6" />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>평균 주문액</h3>
            <p className={styles.statValue}>
              {stats.totalOrders > 0
                ? formatNumber(Math.round(stats.totalSales / stats.totalOrders))
                : 0}원
            </p>
            <span className={styles.statDescription}>
              주문당 평균 금액
            </span>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className={styles.recentActivities}>
        {/* 최근 주문 */}
        <div className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>
            <Package size={20} />
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
                      {order.storeName || '가게명 없음'} | {order.customerName || '고객명 없음'} | {formatNumber(order.totalPrice || order.totalAmount || 0)}원
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

        {/* 최근 활동 로그 */}
        <div className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>
            <Activity size={20} />
            최근 활동 로그
          </h2>
          <div className={styles.activityList}>
            {stats.recentLogs.length === 0 ? (
              <p className={styles.emptyMessage}>최근 활동이 없습니다</p>
            ) : (
              stats.recentLogs.map(log => (
                <div key={log.id} className={styles.activityItem}>
                  <div className={styles.activityInfo}>
                    <p className={styles.activityTitle}>
                      {log.restaurantName || '업체명 없음'}
                    </p>
                    <p className={styles.activityDetail}>
                      {getActionText(log.actionType)}
                    </p>
                  </div>
                  <span className={styles.activityTime}>
                    {formatDate(log.timestamp)}
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
          <a href="/admin/logs" className={styles.quickMenuItem}>
            <Activity size={20} />
            <span>활동 로그</span>
          </a>
          <a href="/admin/orders" className={styles.quickMenuItem}>
            <ShoppingBag size={20} />
            <span>주문 관리</span>
          </a>
          <a href="/admin/stores" className={styles.quickMenuItem}>
            <Store size={20} />
            <span>가게 관리</span>
          </a>
          <a href="/admin/users" className={styles.quickMenuItem}>
            <Users size={20} />
            <span>사용자 관리</span>
          </a>
        </div>
      </div>
    </div>
  )
}
