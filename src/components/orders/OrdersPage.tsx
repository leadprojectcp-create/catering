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
  createdAt: Date
  paidAt?: Date
}

export default function OrdersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    const loadOrders = async () => {
      if (!user) {
        router.push('/auth/login')
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
  }, [user, router])

  const getStatusText = (orderStatus: string, paymentStatus: string) => {
    if (paymentStatus === 'unpaid') return '결제 대기'
    if (paymentStatus === 'paid' && orderStatus === 'pending') return '주문 접수'
    if (orderStatus === 'confirmed') return '주문 확인'
    if (orderStatus === 'preparing') return '준비 중'
    if (orderStatus === 'delivering') return '배송 중'
    if (orderStatus === 'delivered') return '배송 완료'
    if (orderStatus === 'cancelled') return '주문 취소'
    return '알 수 없음'
  }

  const getStatusColor = (orderStatus: string, paymentStatus: string) => {
    if (paymentStatus === 'unpaid') return '#999'
    if (paymentStatus === 'paid' && orderStatus === 'pending') return '#2196F3'
    if (orderStatus === 'confirmed') return '#4CAF50'
    if (orderStatus === 'preparing') return '#FF9800'
    if (orderStatus === 'delivering') return '#9C27B0'
    if (orderStatus === 'delivered') return '#4CAF50'
    if (orderStatus === 'cancelled') return '#f44336'
    return '#999'
  }

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'unpaid') return order.paymentStatus === 'unpaid'
    if (filterStatus === 'paid') return order.paymentStatus === 'paid'
    if (filterStatus === 'completed') return order.orderStatus === 'delivered'
    if (filterStatus === 'cancelled') return order.orderStatus === 'cancelled'
    return true
  })

  if (loading) {
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
            전체
          </button>
          <button
            className={filterStatus === 'unpaid' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('unpaid')}
          >
            결제 대기
          </button>
          <button
            className={filterStatus === 'paid' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('paid')}
          >
            결제 완료
          </button>
          <button
            className={filterStatus === 'completed' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('completed')}
          >
            배송 완료
          </button>
          <button
            className={filterStatus === 'cancelled' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('cancelled')}
          >
            취소
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
                  <button className={styles.detailButton}>상세보기</button>
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
