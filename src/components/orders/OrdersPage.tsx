'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import OrderDetailModal from './OrderDetailModal'
import styles from './OrdersPage.module.css'

interface OrderItem {
  productId: string
  productName: string
  options: { [key: string]: string }
  quantity: number
  price: number
}

interface Order {
  id: string
  userId: string
  storeId: string
  storeName: string
  items: OrderItem[]
  totalPrice: number
  totalProductPrice: number
  deliveryFee: number
  orderStatus: string
  paymentStatus: string
  deliveryMethod: string
  deliveryDate: string
  deliveryTime: string
  address: string
  detailAddress?: string
  recipient: string
  orderer: string
  phone: string
  request?: string
  detailedRequest?: string
  paymentId?: string
  transactionId?: string
  orderNumber?: string
  createdAt: Date
  paidAt?: Date
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'cancelled_rejected' | 'preparing' | 'shipping' | 'delivered'>('all')

  useEffect(() => {
    const loadOrders = async () => {
      // 인증 로딩 중이면 대기
      if (authLoading) return

      // 인증 완료 후 유저가 없으면 로그인 페이지로
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const ordersRef = collection(db, 'orders')
        const q = query(
          ordersRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
        const querySnapshot = await getDocs(q)

        const ordersData: Order[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          ordersData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            paidAt: data.paidAt?.toDate(),
          } as Order)
        })

        setOrders(ordersData)
      } catch (error) {
        console.error('주문 목록 로딩 실패:', error)
        alert('주문 목록을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [user, authLoading, router])

  const getStatusText = (orderStatus: string, paymentStatus: string) => {
    // 결제 상태 우선 체크
    if (paymentStatus === 'unpaid') return '결제 미완료'
    if (paymentStatus === 'failed') return '결제 실패'
    if (paymentStatus === 'refunded') return '환불됨'

    // 주문 상태 체크
    if (orderStatus === 'pending') return '업체 승인 대기'
    if (orderStatus === 'rejected') return '업체 거부'
    if (orderStatus === 'preparing') return '준비 중'
    if (orderStatus === 'shipping') return '배송 중'
    if (orderStatus === 'delivered') return '배송 완료'
    if (orderStatus === 'cancelled') return '취소됨'

    return '알 수 없음'
  }

  const getStatusColor = (orderStatus: string, paymentStatus: string) => {
    // 결제 상태 우선 체크
    if (paymentStatus === 'unpaid') return '#999'
    if (paymentStatus === 'failed') return '#f44336'
    if (paymentStatus === 'refunded') return '#FF9800'

    // 주문 상태 체크
    if (orderStatus === 'pending') return '#2196F3'
    if (orderStatus === 'rejected') return '#f44336'
    if (orderStatus === 'preparing') return '#FF9800'
    if (orderStatus === 'shipping') return '#9C27B0'
    if (orderStatus === 'delivered') return '#4CAF50'
    if (orderStatus === 'cancelled') return '#f44336'

    return '#999'
  }

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'cancelled_rejected') return order.orderStatus === 'cancelled' || order.orderStatus === 'rejected'
    return order.orderStatus === filterStatus
  })

  if (authLoading || loading) {
    return <Loading />
  }

  return (
    <>
      <div className={styles.container}>
        <h1 className={styles.title}>주문 목록</h1>

        {/* 필터 */}
        <div className={styles.filters}>
          <button
            className={filterStatus === 'all' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('all')}
          >
            전체 ({orders.length})
          </button>
          <button
            className={filterStatus === 'pending' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('pending')}
          >
            신규 주문 ({orders.filter(o => o.orderStatus === 'pending').length})
          </button>
          <button
            className={filterStatus === 'cancelled_rejected' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('cancelled_rejected')}
          >
            주문 취소 ({orders.filter(o => o.orderStatus === 'cancelled' || o.orderStatus === 'rejected').length})
          </button>
          <button
            className={filterStatus === 'preparing' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('preparing')}
          >
            준비중 ({orders.filter(o => o.orderStatus === 'preparing').length})
          </button>
          <button
            className={filterStatus === 'shipping' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('shipping')}
          >
            배송중 ({orders.filter(o => o.orderStatus === 'shipping').length})
          </button>
          <button
            className={filterStatus === 'delivered' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('delivered')}
          >
            배송완료 ({orders.filter(o => o.orderStatus === 'delivered').length})
          </button>
        </div>

        {/* 주문 목록 */}
        {filteredOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>주문 내역이 없습니다.</p>
          </div>
        ) : (
          <div className={styles.orderList}>
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className={styles.orderCard}
                onClick={() => setSelectedOrder(order)}
              >
                <div className={styles.orderHeader}>
                  <div className={styles.orderDate}>
                    {order.createdAt.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div
                    className={styles.orderStatus}
                    style={{
                      color: getStatusColor(order.orderStatus, order.paymentStatus),
                    }}
                  >
                    {getStatusText(order.orderStatus, order.paymentStatus)}
                  </div>
                </div>

                <div className={styles.orderBody}>
                  <div className={styles.storeName}>{order.storeName}</div>
                  <div className={styles.orderItems}>
                    {order.items.map((item, index) => (
                      <div key={index} className={styles.orderItem}>
                        {item.productName}
                        {Object.entries(item.options).length > 0 && (
                          <span className={styles.orderOptions}>
                            {' '}
                            ({Object.values(item.options).join(', ')})
                          </span>
                        )}
                        <span className={styles.orderQuantity}> x {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.deliveryInfo}>
                    <span className={styles.deliveryMethod}>{order.deliveryMethod}</span>
                    <span className={styles.deliveryDate}>
                      {order.deliveryDate} {order.deliveryTime}
                    </span>
                  </div>
                </div>

                <div className={styles.orderFooter}>
                  <div className={styles.orderTotal}>
                    총 결제금액: <span>{order.totalPrice.toLocaleString()}원</span>
                  </div>
                  <div className={styles.buttonGroup}>
                    <button className={styles.detailButton}>상세보기</button>
                    {order.orderStatus === 'delivered' && (
                      <button
                        className={styles.reviewButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/reviews/write?orderId=${order.id}`)
                        }}
                      >
                        리뷰 쓰기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 주문 상세 모달 */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </>
  )
}
