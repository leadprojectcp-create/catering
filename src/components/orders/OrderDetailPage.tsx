'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
  productImage?: string
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
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      // 인증 로딩 중이면 대기
      if (authLoading) return

      // 인증 완료 후 유저가 없으면 로그인 페이지로
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

        // 각 상품의 이미지 가져오기
        const itemsWithImages = await Promise.all(
          (orderData.items || []).map(async (item: OrderItem) => {
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

        setOrder({
          id: orderDoc.id,
          ...orderData,
          items: itemsWithImages,
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
  }, [user, authLoading, resolvedParams.id, router])

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

  if (authLoading || loading) {
    return <Loading />
  }

  if (!order) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* 상품정보 */}
        <div className={styles.sectionWrapper}>
          <h2 className={styles.sectionTitle}>상품정보</h2>
          <section className={styles.orderDetailSection}>
            {/* 업체명 및 액션 버튼 */}
            <div className={styles.storeHeader}>
            <div className={styles.storeName}>{order.storeName}</div>
            <div className={styles.storeActions}>
              <button className={styles.actionButton}>
                <Image src="/icons/chat.png" alt="채팅" width={20} height={20} />
                <span>채팅</span>
              </button>
              <button className={styles.actionButton}>
                <Image src="/icons/phone.png" alt="전화" width={20} height={20} />
                <span>전화</span>
              </button>
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* 주문 일시 및 번호 */}
          <div className={styles.orderBasicInfo}>
            <div className={styles.orderDateTime}>
              {order.createdAt.toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })} 주문
            </div>
            <div className={styles.orderNumberText}>
              주문번호 {order.orderNumber || order.id}
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* 주문 상태 정보 */}
          <div className={styles.statusInfo}>
            <div className={styles.statusText}>
              {getStatusText(order.orderStatus, order.paymentStatus)}
            </div>
            <div className={styles.reservationInfo}>
              예약날짜 {order.createdAt.toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })}
            </div>
            <div className={styles.paymentInfo}>
              {order.paymentStatus === 'paid' ? '결제완료' : '결제 미완료'} {order.totalPrice.toLocaleString()}원
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* 상품 목록 */}
          {order.items.map((item, index) => (
            <div key={index} className={styles.productItem}>
              {item.productImage && (
                <Image
                  src={item.productImage}
                  alt={item.productName}
                  width={80}
                  height={80}
                  className={styles.productImage}
                />
              )}
              <div className={styles.productInfo}>
                <div className={styles.productName}>{item.productName}</div>
                {Object.entries(item.options).length > 0 && (
                  <div className={styles.productOptions}>
                    {Object.entries(item.options).map(([key, value]) => (
                      <div key={key} className={styles.optionItem}>
                        <div className={styles.optionGroup}>[{key}]</div>
                        <div className={styles.optionValue}>{value} +{item.price?.toLocaleString() || 0}원 {item.quantity}개</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {order.request && (
            <>
              <div className={styles.divider}></div>
              <div className={styles.requestSection}>
                <div className={styles.requestLabel}>가게 요청사항</div>
                <div className={styles.requestValue}>{order.request}</div>
              </div>
            </>
          )}
          </section>
        </div>

        {/* 상품 수령 방법 및 배송정보 */}
        <div className={styles.sectionWrapper}>
          <h2 className={styles.sectionTitle}>
            {order.deliveryMethod === '매장 픽업' ? '상품수령 및 픽업정보' : '상품수령 및 배송정보'}
          </h2>
          <section className={styles.deliverySection}>
          <div className={styles.deliveryHeader}>
            <div className={styles.deliveryMethodLabel}>{order.deliveryMethod}</div>
            {order.deliveryMethod === '퀵업체 배송' && (
              <button className={styles.actionButton}>
                <Image src="/icons/phone.png" alt="전화" width={20} height={20} />
                <span>배송기사 전화</span>
              </button>
            )}
          </div>

          <div className={styles.divider}></div>

          <div className={styles.deliveryInfoSection}>
            <div className={styles.deliveryInfoTitle}>배송정보</div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>수령인</span>
              <span className={styles.infoValue}>{order.recipient}</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>연락처</span>
              <span className={styles.infoValue}>{order.phone}</span>
            </div>

            {order.deliveryMethod === '퀵업체 배송' && (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>주소</span>
                  <span className={styles.infoValue}>
                    {order.address}
                    {order.detailAddress && ` ${order.detailAddress}`}
                  </span>
                </div>
              </>
            )}

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>{order.deliveryMethod === '매장 픽업' ? '픽업날짜' : '배송날짜'}</span>
              <span className={styles.infoValue}>
                {order.deliveryDate} {order.deliveryTime}
              </span>
            </div>

            {order.detailedRequest && order.deliveryMethod === '퀵업체 배송' && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>배달 요청사항</span>
                <span className={styles.infoValue}>{order.detailedRequest}</span>
              </div>
            )}
          </div>
          </section>
        </div>

        {/* 결제 정보 */}
        <div className={styles.sectionWrapper}>
          <h2 className={styles.sectionTitle}>결제정보</h2>
          <section className={styles.paymentSection}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>상품금액</span>
              <span className={styles.infoValue}>{order.totalProductPrice.toLocaleString()}원</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>배송비</span>
              <span className={styles.infoValue}>{order.deliveryFee.toLocaleString()}원</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.infoRow}>
              <span className={styles.totalLabel}>총 결제금액</span>
              <span className={styles.totalValue}>{order.totalPrice.toLocaleString()}원</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
