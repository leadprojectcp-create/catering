'use client'

import { useState, useEffect } from 'react'
import { getStoreOrders, updateOrderStatus } from '@/lib/services/orderService'
import type { Order, OrderStatus } from '@/lib/services/orderService'
import type { Timestamp, FieldValue } from 'firebase/firestore'
import { auth } from '@/lib/firebase'
import Loading from '@/components/Loading'
import styles from './OrderManagementPage.module.css'

type FilterStatus = 'all' | 'pending' | 'cancelled_rejected' | 'preparing' | 'shipping' | 'delivered'

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [storeId, setStoreId] = useState<string>('')

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
        <h1 className={styles.title}>주문 관리</h1>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 ({orders.length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
            onClick={() => setFilter('pending')}
          >
            신규 주문 ({orders.filter(o => o.orderStatus === 'pending').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'cancelled_rejected' ? styles.active : ''}`}
            onClick={() => setFilter('cancelled_rejected')}
          >
            주문 취소 ({orders.filter(o => o.orderStatus === 'rejected' || o.orderStatus === 'cancelled').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'preparing' ? styles.active : ''}`}
            onClick={() => setFilter('preparing')}
          >
            준비중 ({orders.filter(o => o.orderStatus === 'preparing').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'shipping' ? styles.active : ''}`}
            onClick={() => setFilter('shipping')}
          >
            배송중 ({orders.filter(o => o.orderStatus === 'shipping').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'delivered' ? styles.active : ''}`}
            onClick={() => setFilter('delivered')}
          >
            배송완료 ({orders.filter(o => o.orderStatus === 'delivered').length})
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className={styles.empty}>
          주문이 없습니다.
        </div>
      ) : (
        <div className={styles.orderGrid}>
          {filteredOrders.map((order) => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.cardHeader}>
                <div className={styles.orderNumber}>
                  {order.orderNumber || order.id}
                </div>
                <div className={styles.orderDate}>
                  {formatDate(order.createdAt)}
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>고객 정보</div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{order.userName || '-'}</div>
                    <div className={styles.userEmail}>{order.userEmail || '-'}</div>
                    <div className={styles.userPhone}>{order.phoneNumber}</div>
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>매장</div>
                  <div className={styles.storeName}>{order.storeName}</div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>주문 상품</div>
                  <div className={styles.itemsList}>
                    {order.items.slice(0, 2).map((item, idx) => (
                      <div key={idx} className={styles.itemRow}>
                        <span className={styles.itemName}>{item.productName}</span>
                        <span className={styles.itemQuantity}>x {item.quantity}</span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div className={styles.moreItems}>외 {order.items.length - 2}개</div>
                    )}
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>배송지</div>
                  <div className={styles.address}>{order.deliveryAddress}</div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionLabel}>주문 금액</div>
                  <div className={styles.amount}>{formatCurrency(order.totalAmount)}</div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <select
                  className={`${styles.statusSelect} ${styles[`status_${order.orderStatus}`]}`}
                  value={order.orderStatus}
                  onChange={(e) => handleStatusChange(order.id || '', e.target.value as OrderStatus)}
                >
                  <option value="pending">신규 주문</option>
                  <option value="accepted">접수됨</option>
                  <option value="preparing">준비중</option>
                  <option value="shipping">배송중</option>
                  <option value="delivered">배송완료</option>
                  <option value="rejected">거부됨</option>
                  <option value="cancelled">취소됨</option>
                </select>
                <button
                  className={styles.detailBtn}
                  onClick={() => alert('주문 상세 기능은 추후 구현 예정입니다.')}
                >
                  상세보기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
