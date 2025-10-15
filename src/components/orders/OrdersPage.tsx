'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { createOrGetChatRoom } from '@/lib/services/chatService'
import { addCartItem } from '@/lib/services/cartService'
import Loading from '@/components/Loading'
import OrderCancelModal from './OrderCancelModal'
import styles from './OrdersPage.module.css'

interface OrderItem {
  productId: string
  productName: string
  options: { [key: string]: string }
  quantity: number
  price: number
  productImage?: string
}

interface Order {
  id: string
  userId: string
  storeId: string
  storeName: string
  partnerId?: string
  partnerPhone?: string
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
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'preparing' | 'shipping' | 'delivered' | 'cancelled'>('all')

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

        // 각 주문에 대해 가게 정보를 가져와서 전화번호와 partnerId 추가
        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data()

          // storeId로 가게 정보 가져오기
          let storePhone = data.partnerPhone
          let partnerId = data.partnerId
          if (data.storeId && (!storePhone || !partnerId)) {
            try {
              const storeDoc = await getDoc(doc(db, 'stores', data.storeId))
              if (storeDoc.exists()) {
                const storeData = storeDoc.data()
                if (!storePhone) storePhone = storeData.phone
                if (!partnerId) partnerId = storeData.partnerId
              }
            } catch (error) {
              console.error('가게 정보 로드 실패:', error)
            }
          }

          // 각 상품의 이미지 가져오기
          const itemsWithImages = await Promise.all(
            (data.items || []).map(async (item: OrderItem) => {
              if (item.productId && !item.productImage) {
                try {
                  const productDoc = await getDoc(doc(db, 'products', item.productId))
                  if (productDoc.exists()) {
                    const productData = productDoc.data()
                    return {
                      ...item,
                      productImage: productData.images?.[0] || null
                    }
                  }
                } catch (error) {
                  console.error('상품 이미지 로드 실패:', error)
                }
              }
              return item
            })
          )

          ordersData.push({
            id: docSnapshot.id,
            ...data,
            partnerId: partnerId,
            partnerPhone: storePhone,
            items: itemsWithImages,
            createdAt: data.createdAt?.toDate() || new Date(),
            paidAt: data.paidAt?.toDate(),
          } as Order)
        }

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
    if (orderStatus === 'pending') return '주문 확인 대기'
    if (orderStatus === 'rejected') return '업체 거부'
    if (orderStatus === 'preparing') return '준비 중'
    if (orderStatus === 'shipping') return '배송 중'
    if (orderStatus === 'delivered') return '배송 완료'
    if (orderStatus === 'cancelled') return '취소요청'

    return '알 수 없음'
  }

  const getStatusColor = (orderStatus: string, paymentStatus: string) => {
    // 결제 상태 우선 체크
    if (paymentStatus === 'unpaid') return '#999'
    if (paymentStatus === 'failed') return '#f44336'
    if (paymentStatus === 'refunded') return '#FF9800'

    // 주문 상태 체크
    if (orderStatus === 'pending') return '#2196F3'
    if (orderStatus === 'accepted') return '#4CAF50'
    if (orderStatus === 'rejected') return '#f44336'
    if (orderStatus === 'preparing') return '#FF9800'
    if (orderStatus === 'shipping') return '#9C27B0'
    if (orderStatus === 'delivered') return '#4CAF50'
    if (orderStatus === 'cancelled') return '#f44336'

    return '#999'
  }

  const filteredOrders = orders.filter((order) => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'cancelled') return order.orderStatus === 'cancelled' || order.orderStatus === 'rejected'
    return order.orderStatus === filterStatus
  })

  const handleChatClick = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    if (!order.partnerId) {
      alert('가게 정보를 불러오는 중입니다.')
      return
    }

    try {
      const roomId = await createOrGetChatRoom(
        user.uid,
        order.storeId,
        order.storeName,
        order.partnerId
      )
      router.push(`/chat?roomId=${roomId}`)
    } catch (error) {
      console.error('채팅방 생성 실패:', error)
      alert('채팅방 생성에 실패했습니다.')
    }
  }

  const handleAddToCart = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    try {
      // 주문의 첫 번째 상품을 장바구니에 추가
      const firstItem = order.items[0]

      await addCartItem({
        uid: user.uid,
        storeId: order.storeId,
        productId: firstItem.productId,
        productName: firstItem.productName,
        productPrice: firstItem.price,
        productImage: firstItem.productImage || '',
        items: order.items.map(item => ({
          options: item.options,
          quantity: item.quantity
        })),
        totalPrice: order.totalPrice,
        createdAt: new Date()
      })

      alert('장바구니에 담았습니다.')
      router.push('/cart')
    } catch (error) {
      console.error('장바구니 담기 실패:', error)
      alert('장바구니 담기에 실패했습니다.')
    }
  }

  if (authLoading || loading) {
    return <Loading />
  }

  return (
    <>
      <div className={styles.container}>
        <h1 className={styles.title}>주문/배송내역</h1>

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
            주문확인대기 ({orders.filter(o => o.orderStatus === 'pending').length})
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
          <button
            className={filterStatus === 'cancelled' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('cancelled')}
          >
            주문취소 ({orders.filter(o => o.orderStatus === 'cancelled' || o.orderStatus === 'rejected').length})
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
              >
                <div className={styles.orderHeader}>
                  <div className={styles.orderStatus}>
                    {getStatusText(order.orderStatus, order.paymentStatus)}
                  </div>
                  <div className={styles.headerActions}>
                    <button
                      className={styles.chatButton}
                      onClick={(e) => handleChatClick(order, e)}
                    >
                      <Image src="/icons/chat.png" alt="채팅" width={20} height={20} />
                      <span>채팅</span>
                    </button>
                    {order.partnerPhone && (
                      <a
                        href={`tel:${order.partnerPhone}`}
                        className={styles.phoneButton}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Image src="/icons/phone.png" alt="전화" width={20} height={20} />
                        <span>전화</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className={styles.orderDate}>
                  {order.createdAt.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })} 주문
                </div>

                <div className={styles.orderNumber}>{order.orderNumber}</div>

                <div className={styles.orderItems}>
                  {order.items.slice(0, 1).map((item, index) => (
                    <div key={index} className={styles.orderItem}>
                      {item.productImage && (
                        <Image
                          src={item.productImage}
                          alt={item.productName}
                          width={100}
                          height={100}
                          className={styles.productImage}
                        />
                      )}
                      <div className={styles.itemInfo}>
                        <div className={styles.productName}>
                          {item.productName}
                          {order.items.length > 1 && ` 외 ${order.items.length - 1}개`}
                        </div>
                        <div className={styles.reservationDateTime}>
                          예약날짜 {order.deliveryDate} {order.deliveryTime}
                        </div>
                        <div className={`${styles.deliveryMethod} ${
                          order.deliveryMethod === '퀵업체 배송'
                            ? styles.deliveryMethodQuick
                            : order.deliveryMethod === '매장픽업'
                            ? styles.deliveryMethodPickup
                            : ''
                        }`}>
                          {order.deliveryMethod}
                        </div>
                        <div className={`${styles.orderTotal} ${order.paymentStatus === 'failed' ? styles.orderTotalFailed : ''}`}>
                          {order.paymentStatus === 'unpaid' && `결제 미완료 ${order.totalPrice.toLocaleString()}원`}
                          {order.paymentStatus === 'paid' && `결제 완료 ${order.totalPrice.toLocaleString()}원`}
                          {order.paymentStatus === 'refunded' && `환불됨 ${order.totalPrice.toLocaleString()}원`}
                          {order.paymentStatus === 'failed' && `결제 실패 ${order.totalPrice.toLocaleString()}원`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.buttonGroup}>
                  {order.orderStatus === 'delivered' ? (
                    <>
                      <button
                        className={styles.detailButton}
                        onClick={(e) => handleAddToCart(order, e)}
                      >
                        장바구니 담기
                      </button>
                      <button
                        className={styles.reviewButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/reviews/write?orderId=${order.id}`)
                        }}
                      >
                        리뷰작성
                      </button>
                    </>
                  ) : (
                    <>
                      {(order.orderStatus === 'pending' || order.orderStatus === 'preparing') && (
                        <button
                          className={styles.cancelButton}
                          onClick={(e) => {
                            e.stopPropagation()
                            setCancelOrderId(order.id)
                          }}
                        >
                          주문취소
                        </button>
                      )}
                      <button
                        className={styles.detailButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/orders/${order.id}`)
                        }}
                      >
                        주문상세
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 주문 취소 모달 */}
      {cancelOrderId && (
        <OrderCancelModal
          orderId={cancelOrderId}
          onClose={() => setCancelOrderId(null)}
          onCancel={() => {
            // 주문 목록 새로고침
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
