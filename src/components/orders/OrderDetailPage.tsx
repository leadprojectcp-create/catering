'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import styles from './OrderDetailPage.module.css'

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

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const orderDoc = await getDoc(doc(db, 'orders', resolvedParams.id))
        
        if (!orderDoc.exists()) {
          alert('주문을 찾을 수 없습니다.')
          router.push('/orders')
          return
        }

        const orderData = orderDoc.data()
        
        // 본인의 주문인지 확인
        if (orderData.userId !== user.uid) {
          alert('접근 권한이 없습니다.')
          router.push('/orders')
          return
        }

        setOrder({
          id: orderDoc.id,
          ...orderData,
          createdAt: orderData.createdAt?.toDate(),
          paidAt: orderData.paidAt?.toDate(),
        } as Order)
      } catch (error) {
        console.error('주문 조회 실패:', error)
        alert('주문 정보를 불러오는데 실패했습니다.')
        router.push('/orders')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [user, resolvedParams.id, router])

  const getStatusText = (orderStatus: string, paymentStatus: string) => {
    if (paymentStatus === 'unpaid') return '결제 미완료'
    if (paymentStatus === 'failed') return '결제 실패'
    if (paymentStatus === 'refunded') return '환불됨'

    if (orderStatus === 'pending') return '업체 승인 대기'
    if (orderStatus === 'rejected') return '업체 거부'
    if (orderStatus === 'preparing') return '준비 중'
    if (orderStatus === 'shipping') return '배송 중'
    if (orderStatus === 'delivered') return '배송 완료'
    if (orderStatus === 'cancelled') return '취소됨'

    return '알 수 없음'
  }

  const getStatusColor = (orderStatus: string, paymentStatus: string) => {
    if (paymentStatus === 'unpaid') return '#999'
    if (paymentStatus === 'failed') return '#f44336'
    if (paymentStatus === 'refunded') return '#FF9800'

    if (orderStatus === 'pending') return '#2196F3'
    if (orderStatus === 'rejected') return '#f44336'
    if (orderStatus === 'preparing') return '#FF9800'
    if (orderStatus === 'shipping') return '#9C27B0'
    if (orderStatus === 'delivered') return '#4CAF50'
    if (orderStatus === 'cancelled') return '#f44336'

    return '#999'
  }

  if (loading) {
    return <Loading />
  }

  if (!order) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()}>
          ← 뒤로
        </button>
        <h1>주문 상세</h1>
      </div>

      <div className={styles.content}>
        {/* 주문 정보 */}
        <section className={styles.section}>
          <h3>주문 정보</h3>
          <div className={styles.infoRow}>
            <span className={styles.label}>주문번호</span>
            <span className={styles.value}>{order.orderNumber || order.id}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>주문일시</span>
            <span className={styles.value}>
              {order.createdAt.toLocaleString('ko-KR')}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>주문상태</span>
            <span
              className={styles.value}
              style={{
                color: getStatusColor(order.orderStatus, order.paymentStatus),
                fontWeight: 'bold'
              }}
            >
              {getStatusText(order.orderStatus, order.paymentStatus)}
            </span>
          </div>
          {order.paidAt && (
            <div className={styles.infoRow}>
              <span className={styles.label}>결제일시</span>
              <span className={styles.value}>
                {order.paidAt.toLocaleString('ko-KR')}
              </span>
            </div>
          )}
        </section>

        {/* 상품 정보 */}
        <section className={styles.section}>
          <h3>상품 정보</h3>
          <div className={styles.storeName}>{order.storeName}</div>
          {order.items.map((item, index) => (
            <div key={index} className={styles.productItem}>
              <div className={styles.productInfo}>
                <div className={styles.productName}>{item.productName}</div>
                {Object.entries(item.options).length > 0 && (
                  <div className={styles.productOptions}>
                    {Object.entries(item.options).map(([key, value]) => (
                      <span key={key}>
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.productPrice}>
                {item.price.toLocaleString()}원 x {item.quantity}
              </div>
            </div>
          ))}
        </section>

        {/* 배송 정보 */}
        <section className={styles.section}>
          <h3>배송 정보</h3>
          <div className={styles.infoRow}>
            <span className={styles.label}>배송방법</span>
            <span className={styles.value}>{order.deliveryMethod}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>배송일시</span>
            <span className={styles.value}>
              {order.deliveryDate} {order.deliveryTime}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>수령인</span>
            <span className={styles.value}>{order.recipient}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>연락처</span>
            <span className={styles.value}>{order.phone}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>주소</span>
            <span className={styles.value}>
              {order.address}
              {order.detailAddress && ` ${order.detailAddress}`}
            </span>
          </div>
          {order.request && (
            <div className={styles.infoRow}>
              <span className={styles.label}>요청사항</span>
              <span className={styles.value}>{order.request}</span>
            </div>
          )}
          {order.detailedRequest && (
            <div className={styles.infoRow}>
              <span className={styles.label}>상세요청사항</span>
              <span className={styles.value}>{order.detailedRequest}</span>
            </div>
          )}
        </section>

        {/* 결제 정보 */}
        <section className={styles.section}>
          <h3>결제 정보</h3>
          <div className={styles.priceRow}>
            <span>상품금액</span>
            <span>{order.totalProductPrice.toLocaleString()}원</span>
          </div>
          <div className={styles.priceRow}>
            <span>배송비</span>
            <span>{order.deliveryFee.toLocaleString()}원</span>
          </div>
          <div className={styles.totalRow}>
            <span>총 결제금액</span>
            <span>{order.totalPrice.toLocaleString()}원</span>
          </div>
          {order.paymentId && (
            <div className={styles.infoRow}>
              <span className={styles.label}>결제ID</span>
              <span className={styles.value}>{order.paymentId}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
