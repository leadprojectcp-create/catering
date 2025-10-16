'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getStoreOrders, updateOrderStatus } from '@/lib/services/orderService'
import type { Order, OrderStatus } from '@/lib/services/orderService'
import type { Timestamp, FieldValue } from 'firebase/firestore'
import { auth } from '@/lib/firebase'
import Loading from '@/components/Loading'
import styles from './OrderManagementPage.module.css'

type FilterStatus = 'all' | 'pending' | 'cancelled_rejected' | 'preparing' | 'shipping' | 'delivered'

export default function OrderManagementPage() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [storeId, setStoreId] = useState<string>('')

  useEffect(() => {
    // URL 파라미터에서 filter 값 읽기
    const filterParam = searchParams.get('filter')
    if (filterParam && ['all', 'pending', 'cancelled_rejected', 'preparing', 'shipping', 'delivered'].includes(filterParam)) {
      setFilter(filterParam as FilterStatus)
    }
  }, [searchParams])

  useEffect(() => {
    // 현재 사용자의 storeId 가져오기 (파트너의 UID를 storeId로 사용)
    const user = auth.currentUser
    if (user) {
      setStoreId(user.uid)
      loadOrders(user.uid)
    }
  }, [])

  const loadOrders = async (sid: string) => {
    if (!sid) return

    try {
      setLoading(true)
      const data = await getStoreOrders(sid)
      setOrders(data)
    } catch (error) {
      console.error('주문 목록 로드 실패:', error)
      alert('주문 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: '신규 주문',
      accepted: '접수됨',
      preparing: '준비중',
      shipping: '배송중',
      delivered: '배송완료',
      rejected: '거부됨',
      cancelled: '취소됨'
    }
    return labels[status] || status
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!orderId) return

    if (!confirm(`주문 상태를 ${getStatusLabel(newStatus)}(으)로 변경하시겠습니까?`)) {
      return
    }

    try {
      await updateOrderStatus(orderId, newStatus)
      setOrders(orders.map(o => o.id === orderId ? { ...o, orderStatus: newStatus } : o))
      alert('주문 상태가 변경되었습니다.')
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    if (filter === 'cancelled_rejected') return order.orderStatus === 'rejected' || order.orderStatus === 'cancelled'
    return order.orderStatus === filter
  })

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>주문내역</h1>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 {orders.length > 0 && <span className={styles.filterCount}>{orders.length}</span>}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
            onClick={() => setFilter('pending')}
          >
            신규 주문 {orders.filter(o => o.orderStatus === 'pending').length > 0 && <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'pending').length}</span>}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'cancelled_rejected' ? styles.active : ''}`}
            onClick={() => setFilter('cancelled_rejected')}
          >
            주문 취소 {orders.filter(o => o.orderStatus === 'rejected' || o.orderStatus === 'cancelled').length > 0 && <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'rejected' || o.orderStatus === 'cancelled').length}</span>}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'preparing' ? styles.active : ''}`}
            onClick={() => setFilter('preparing')}
          >
            준비중 {orders.filter(o => o.orderStatus === 'preparing').length > 0 && <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'preparing').length}</span>}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'shipping' ? styles.active : ''}`}
            onClick={() => setFilter('shipping')}
          >
            배송중 {orders.filter(o => o.orderStatus === 'shipping').length > 0 && <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'shipping').length}</span>}
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'delivered' ? styles.active : ''}`}
            onClick={() => setFilter('delivered')}
          >
            배송완료 {orders.filter(o => o.orderStatus === 'delivered').length > 0 && <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'delivered').length}</span>}
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className={styles.empty}>
          주문이 없습니다.
        </div>
      ) : (
        <div className={styles.contentWrapper}>
          {/* 왼쪽: 주문 리스트 */}
          <div className={styles.orderListContainer}>
            <div className={styles.orderListHeader}>
              {filter === 'all' && '전체'}
              {filter === 'pending' && '신규주문'}
              {filter === 'cancelled_rejected' && '주문 취소'}
              {filter === 'preparing' && '준비중'}
              {filter === 'shipping' && '배송중'}
              {filter === 'delivered' && '배송완료'}
              {' '}{filteredOrders.length}개
            </div>
            <div className={styles.orderList}>
            {filteredOrders.map((order) => {
              // D-day 계산
              const deliveryDateObj = new Date(order.deliveryDate)
              const today = new Date()
              const diffTime = deliveryDateObj.getTime() - today.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              const dDay = diffDays >= 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`

              // 상품명 요약
              const firstProduct = order.items[0]?.productName || ''
              const totalCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
              const productSummary = `${firstProduct} 외 ${totalCount}개`

              // 예약날짜 포맷
              const reservationDate = new Date(order.deliveryDate)
              const year = reservationDate.getFullYear()
              const month = reservationDate.getMonth() + 1
              const day = reservationDate.getDate()
              const weekdays = ['일', '월', '화', '수', '목', '금', '토']
              const weekday = weekdays[reservationDate.getDay()]
              const [hour, minute] = order.deliveryTime.split(':').map(Number)
              const period = hour >= 12 ? '오후' : '오전'
              const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
              const formattedReservation = `${year}년 ${month}월 ${day}일 (${weekday}) ${period} ${displayHour}시 ${minute}분`

              // 배송방법 텍스트
              const deliveryMethodText = order.deliveryMethod === '퀵배송' ? '퀵업체 배송' : '매장픽업'

              return (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div className={styles.deliveryBadge}>{deliveryMethodText}</div>
                    <div className={styles.dDay}>{dDay}</div>
                    <span className={styles.orderNumberText}>주문번호 {order.orderNumber || order.id}</span>
                  </div>
                  <div className={styles.productName}>{productSummary}</div>
                  <div className={styles.orderInfo}>예약날짜 {formattedReservation}</div>
                  <div className={styles.orderInfo}>결제완료 {formatCurrency(order.totalPrice)}</div>
                </div>
              )
            })}
            </div>
          </div>

          {/* 가운데: 주문 상세 (추후 추가) */}
          <div className={styles.orderDetailContainer}>
            {/* 주문 상세 내용 */}
          </div>

          {/* 오른쪽: 추가 정보 (추후 추가) */}
          <div className={styles.orderInfoContainer}>
            {/* 추가 정보 */}
          </div>
        </div>
      )}
    </div>
  )
}
