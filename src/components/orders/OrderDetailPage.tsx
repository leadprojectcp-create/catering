'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { createOrGetChatRoom } from '@/lib/services/chatService'
import { addCartItem } from '@/lib/services/cartService'
import Loading from '@/components/Loading'
import OrderCancelModal from './OrderCancelModal'
import TaxInvoiceModal from './TaxInvoiceModal'
import TrackingInfoModal from './TrackingInfoModal'
import styles from './OrderDetailPage.module.css'
import OrderHeaderSection from './orderDetail/OrderHeaderSection'
import RegularOrderSection from './orderDetail/RegularOrderSection'
import AdditionalOrderSection from './orderDetail/AdditionalOrderSection'
import RequestSection from './orderDetail/RequestSection'

interface KakaoShareOptions {
  objectType: string
  content: {
    title: string
    description: string
    imageUrl: string
    link: {
      mobileWebUrl: string
      webUrl: string
    }
  }
  buttons?: Array<{
    title: string
    link: {
      mobileWebUrl: string
      webUrl: string
    }
  }>
}

interface KakaoShare {
  sendDefault: (options: KakaoShareOptions) => void
}

interface Kakao {
  isInitialized: () => boolean
  init: (appKey: string) => void
  Share?: KakaoShare
}

declare global {
  interface Window {
    Kakao?: Kakao
  }
}

interface OrderItem {
  productId: string
  productName: string
  options: { [key: string]: string }
  additionalOptions?: { [key: string]: string }
  optionsWithPrices?: { [key: string]: { name: string; price: number } }
  additionalOptionsWithPrices?: { [key: string]: { name: string; price: number } }
  quantity: number
  price: number
  itemPrice?: number
  productImage?: string
  isAddItem?: boolean
  paymentId?: string
  createdAt?: Date
}

interface DeliveryInfo {
  addressName?: string
  deliveryDate: string
  deliveryTime: string
  address: string
  detailAddress?: string
  recipient: string
  recipientPhone: string
  deliveryRequest?: string
  detailedRequest?: string
}

interface PaymentInfo {
  paymentId: string
  paidAt: Date
  paymentKey?: string
  orderId?: string
  amount?: number
  method?: string
  status?: string
  cancelledAt?: Date
}

interface Order {
  id: string
  uid: string
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
  parcelPaymentMethod?: '선결제' | '착불'
  deliveryInfo?: DeliveryInfo
  paymentInfo?: PaymentInfo[]
  // 이전 형식 호환을 위한 필드들
  deliveryDate?: string
  deliveryTime?: string
  address?: string
  detailAddress?: string
  recipient?: string
  orderer: string
  phone: string
  request?: string
  deliveryRequest?: string
  detailedRequest?: string
  paymentId?: string
  transactionId?: string
  orderNumber?: string
  // 택배 정보
  carrier?: string
  trackingNumber?: string
  trackingInfo?: {
    carrier: string
    trackingNumber: string
  }
  createdAt: Date
  usedPoint?: number
  // 퀵 배송 관련 필드
  quickDeliveryOrderNo?: number
  quickDeliveryStatus?: string
  quickDeliveryError?: string
  quickDeliveryInfo?: {
    code: string
    orderNo: number
    orderInfo?: {
      feeTotal?: number
      feeDetail?: string
    }
    createdAt: Date
  }
  deliveryFeeSettings?: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    perQuantity?: number
  }
  quickDeliveryFeeSettings?: {
    type: '무료' | '조건부 지원' | '유료'
    baseFee?: number
    freeCondition?: number
    maxSupport?: number
  }
  totalQuantity?: number
}

// 퀵 배송 기사 정보
interface QuickDeliveryDriver {
  rName: string  // 기사 이름
  rMobile: string  // 기사 연락처
  sState: string  // 배차 상태
  dtAllo: string  // 배차 시간
  dtPick: string  // 픽업 시간
  dtEnd: string  // 배송 완료 시간
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
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [quickDeliveryDriver, setQuickDeliveryDriver] = useState<QuickDeliveryDriver | null>(null)
  const [loadingDriver, setLoadingDriver] = useState(false)

  // 배송비 계산 함수 (실제 배송비 금액 - totalPrice 기준)
  const getDeliveryFeeAmount = (order: Order): number => {
    // totalPrice에서 totalProductPrice를 빼면 실제 소비자가 부담한 배송비
    const deliveryFeeFromTotal = (order.totalPrice || 0) - (order.totalProductPrice || 0)

    // 음수가 나오면 0 반환
    return Math.max(0, deliveryFeeFromTotal)
  }

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
        if (orderData.uid !== user.uid) {
          alert('접근 권한이 없습니다.')
          router.push('/orders')
          return
        }

        // storeId로 가게 정보 가져오기
        let storePhone = orderData.partnerPhone
        let partnerId = orderData.partnerId
        if (orderData.storeId && (!storePhone || !partnerId)) {
          try {
            const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
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
          partnerId: partnerId,
          partnerPhone: storePhone,
          items: itemsWithImages,
          createdAt: orderData.createdAt,
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

  // 퀵 배송 기사 정보 조회
  useEffect(() => {
    const fetchQuickDeliveryDriver = async () => {
      // 퀵 배송 주문 번호가 없으면 조회하지 않음
      if (!order?.quickDeliveryOrderNo || !order?.deliveryInfo?.deliveryDate) {
        return
      }

      setLoadingDriver(true)
      try {
        const deliveryDate = order.deliveryInfo.deliveryDate // 예: "2025-10-31"

        // 날짜 범위 설정 (해당 날짜 기준 ±3일)
        const targetDate = new Date(deliveryDate)
        const startDate = new Date(targetDate)
        startDate.setDate(startDate.getDate() - 3)
        const endDate = new Date(targetDate)
        endDate.setDate(endDate.getDate() + 3)

        const rangeStart = startDate.toISOString().split('T')[0] // YYYY-MM-DD
        const rangeEnd = endDate.toISOString().split('T')[0]

        console.log('[OrderDetail] 기사 정보 조회:', {
          orderNo: order.quickDeliveryOrderNo,
          rangeStart,
          rangeEnd
        })

        const response = await fetch('/api/quick-delivery/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rangeStart,
            rangeEnd,
            orderNo: String(order.quickDeliveryOrderNo)
          })
        })

        const result = await response.json()
        console.log('[OrderDetail] 기사 정보 조회 결과:', result)

        if (response.ok && result.order) {
          setQuickDeliveryDriver({
            rName: result.order.rName || '',
            rMobile: result.order.rMobile || '',
            sState: result.order.sState || '',
            dtAllo: result.order.dtAllo || '',
            dtPick: result.order.dtPick || '',
            dtEnd: result.order.dtEnd || ''
          })
        } else {
          console.log('[OrderDetail] 기사 정보 없음 또는 조회 실패')
        }
      } catch (error) {
        console.error('[OrderDetail] 기사 정보 조회 실패:', error)
      } finally {
        setLoadingDriver(false)
      }
    }

    fetchQuickDeliveryDriver()
  }, [order?.quickDeliveryOrderNo, order?.deliveryInfo?.deliveryDate])

  const getStatusText = (orderStatus: string, paymentStatus: string) => {
    if (paymentStatus === 'unpaid') return '결제 미완료'
    if (paymentStatus === 'failed') return '결제 실패'
    if (paymentStatus === 'refunded') return '환불됨'

    if (orderStatus === 'pending') return '업체 승인 대기'
    if (orderStatus === 'rejected') return '업체 거부'
    if (orderStatus === 'preparing') return '준비 중'
    if (orderStatus === 'shipping') return '배송 중'
    if (orderStatus === 'completed') return '완료'
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
    if (orderStatus === 'completed') return '#4CAF50'
    if (orderStatus === 'cancelled') return '#f44336'

    return '#999'
  }

  const handleChatClick = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    if (!order?.partnerId) {
      alert('가게 정보를 불러오는 중입니다.')
      return
    }

    // 자기 자신과 채팅하는 것 방지
    if (user.uid === order.partnerId) {
      alert('자기 자신과는 채팅할 수 없습니다.')
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

  const handleAddToCart = async () => {
    if (!user || !order) return

    try {
      // 주문 정보를 장바구니에 추가 (주문하기와 동일한 구조)
      const cartData = {
        uid: user.uid,
        storeId: order.storeId,
        storeName: order.storeName,
        productId: order.items[0].productId,
        productName: order.items[0].productName,
        productImage: order.items[0].productImage,
        items: order.items.map(item => ({
          options: item.options,
          quantity: item.quantity
        })),
        totalProductPrice: order.totalProductPrice,
        totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
        deliveryMethod: order.deliveryMethod,
        request: order.request,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await addCartItem(cartData)

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

  if (!order) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* 주문 내역 */}
        <OrderHeaderSection order={order} user={user} />
        <RegularOrderSection order={order} />
        <AdditionalOrderSection order={order} />
        <RequestSection request={order.request} />

        {/* 상품 수령 방법 및 배송정보 */}
        <div className={styles.sectionWrapper}>
          <h2 className={styles.sectionTitle}>
            {order.deliveryMethod === '매장 픽업' ? '상품수령 및 픽업정보' : '상품수령 및 배송정보'}
          </h2>
          <section className={styles.deliverySection}>
          <div className={styles.deliveryHeader}>
            <div className={`${styles.deliveryMethodLabel} ${
              order.deliveryMethod === '퀵업체 배송'
                ? styles.deliveryMethodQuick
                : order.deliveryMethod === '매장 픽업'
                ? styles.deliveryMethodPickup
                : ''
            }`}>
              {order.deliveryMethod}
            </div>
            {order.deliveryMethod === '퀵업체 배송' && (
              <button className={styles.actionButton}>
                <Image src="/icons/phone.png" alt="전화" width={20} height={20} />
                <span>배송기사 전화</span>
              </button>
            )}
            {order.deliveryMethod === '매장 픽업' && (
              <button
                className={styles.actionButton}
                onClick={async () => {
                  try {
                    // storeId로 가게 주소 가져오기
                    const storeDoc = await getDoc(doc(db, 'stores', order.storeId))
                    if (storeDoc.exists()) {
                      const storeData = storeDoc.data()
                      const address = storeData.address?.fullAddress || ''
                      const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(address)}`
                      window.open(naverMapUrl, '_blank')
                    } else {
                      alert('가게 정보를 찾을 수 없습니다.')
                    }
                  } catch (error) {
                    console.error('가게 정보 조회 실패:', error)
                    alert('길찾기를 실행할 수 없습니다.')
                  }
                }}
              >
                <Image src="/icons/load_search.svg" alt="길찾기" width={20} height={20} />
                <span>길찾기</span>
              </button>
            )}
            {order.deliveryMethod === '택배 배송' && (
              <button
                className={styles.actionButton}
                onClick={() => {
                  if (!order.trackingInfo?.carrier && !order.carrier) {
                    alert('택배 정보가 등록되지 않았습니다.')
                    return
                  }
                  setShowTrackingModal(true)
                }}
              >
                <Image src="/icons/parcel_search.svg" alt="송장 조회" width={20} height={20} />
                <span>송장 조회</span>
              </button>
            )}
          </div>

          <div className={styles.divider}></div>

          <div className={styles.deliveryInfoSection}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>수령인</span>
              <span className={styles.infoValue}>
                {order.deliveryInfo?.recipient || order.recipient}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>연락처</span>
              <span className={styles.infoValue}>
                {order.deliveryInfo?.recipientPhone || order.phone}
              </span>
            </div>
            {order.deliveryMethod === '퀵업체 배송' && (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>주소</span>
                  <span className={styles.infoValue}>
                    {order.deliveryInfo?.address || order.address}
                    {(order.deliveryInfo?.detailAddress || order.detailAddress) && ` ${order.deliveryInfo?.detailAddress || order.detailAddress}`}
                  </span>
                </div>

                {/* 퀵 배송 기사 정보 */}
                {order.quickDeliveryOrderNo && (
                  <>
                    <div className={styles.divider} style={{ margin: '16px 0' }}></div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>배송 상태</span>
                      <span className={styles.infoValue}>
                        {loadingDriver ? (
                          '조회 중...'
                        ) : quickDeliveryDriver && quickDeliveryDriver.rName ? (
                          <>
                            배차 완료
                            {quickDeliveryDriver.dtPick && quickDeliveryDriver.dtPick !== '-' && (
                              <span style={{ marginLeft: '8px', color: '#2196F3' }}>
                                (픽업완료: {quickDeliveryDriver.dtPick})
                              </span>
                            )}
                            {quickDeliveryDriver.dtEnd && quickDeliveryDriver.dtEnd !== '-' && (
                              <span style={{ marginLeft: '8px', color: '#4CAF50' }}>
                                (배송완료: {quickDeliveryDriver.dtEnd})
                              </span>
                            )}
                          </>
                        ) : (
                          '퀵기사님 배차중'
                        )}
                      </span>
                    </div>
                    {quickDeliveryDriver && quickDeliveryDriver.rName && (
                      <>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>기사님 성함</span>
                          <span className={styles.infoValue}>{quickDeliveryDriver.rName}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>기사님 연락처</span>
                          <span className={styles.infoValue}>
                            <a href={`tel:${quickDeliveryDriver.rMobile}`} style={{ color: '#2196F3', textDecoration: 'none' }}>
                              {quickDeliveryDriver.rMobile}
                            </a>
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {order.deliveryMethod === '매장 픽업' && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>픽업날짜</span>
                <span className={styles.infoValue}>
                  {order.deliveryInfo?.deliveryDate || order.deliveryDate} {order.deliveryInfo?.deliveryTime || order.deliveryTime}
                </span>
              </div>
            )}
          </div>

          {((order.deliveryInfo?.deliveryRequest || order.deliveryRequest) ||
            (order.deliveryInfo?.detailedRequest || order.detailedRequest)) &&
            order.deliveryMethod === '퀵업체 배송' && (
            <>
              <div className={styles.divider}></div>
              <div className={styles.requestSection}>
                <div className={styles.requestLabel}>배송 요청사항</div>
                <div className={styles.requestValue}>
                  {(order.deliveryInfo?.deliveryRequest || order.deliveryRequest) &&
                    <div>{order.deliveryInfo?.deliveryRequest || order.deliveryRequest}</div>}
                  {(order.deliveryInfo?.detailedRequest || order.detailedRequest) &&
                    <div>{order.deliveryInfo?.detailedRequest || order.detailedRequest}</div>}
                </div>
              </div>
            </>
          )}
          </section>
        </div>

        {/* 결제 정보 */}
        <div className={styles.sectionWrapper}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>결제정보</h2>
            <button
              className={styles.taxInvoiceButton}
              onClick={() => setShowTaxInvoiceModal(true)}
            >
              세금계산서 요청
            </button>
          </div>
          <section className={styles.paymentSection}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>상품금액</span>
              <span className={styles.infoValue}>{order.totalProductPrice.toLocaleString()}원</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>배송비</span>
              <span className={styles.infoValue}>
                +{getDeliveryFeeAmount(order).toLocaleString()}원
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>포인트 사용</span>
              <span className={styles.infoValue}>-{(order.usedPoint ?? 0).toLocaleString()}원</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.infoRow}>
              <span className={styles.totalLabel}>총 결제금액</span>
              <span className={styles.totalValue}>{order.totalPrice.toLocaleString()}원</span>
            </div>
          </section>
        </div>

        {/* 하단 버튼 */}
        <div className={styles.buttonGroup}>
          {order.paymentStatus === 'unpaid' || order.paymentStatus === 'failed' ? (
            <>
              <button
                className={styles.cancelButton}
                onClick={() => setCancelOrderId(order.id)}
              >
                전체주문취소
              </button>
              <button
                className={styles.payButton}
                onClick={() => router.push(`/payments?orderId=${order.id}`)}
              >
                결제하기
              </button>
            </>
          ) : order.orderStatus === 'delivered' ? (
            <>
              <button className={styles.detailButton} onClick={handleAddToCart}>
                장바구니 담기
              </button>
              <button
                className={styles.reviewButton}
                onClick={() => router.push(`/reviews/write?orderId=${order.id}`)}
              >
                리뷰작성
              </button>
            </>
          ) : (
            <>
              {(order.orderStatus === 'pending' || order.orderStatus === 'preparing') && (
                <button
                  className={styles.cancelButton}
                  onClick={() => setCancelOrderId(order.id)}
                >
                  전체주문취소
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 주문 취소 모달 */}
      {cancelOrderId && order && (
        <OrderCancelModal
          orderId={cancelOrderId}
          deliveryDate={order.deliveryInfo?.deliveryDate || order.deliveryDate || ''}
          totalAmount={order.totalPrice || 0}
          paymentId={order.paymentId || null}
          onClose={() => setCancelOrderId(null)}
          onCancel={() => {
            router.push('/orders')
          }}
        />
      )}

      {/* 세금계산서 모달 */}
      {showTaxInvoiceModal && order && order.paymentId && (
        <TaxInvoiceModal
          orderId={order.id}
          paymentId={order.paymentId}
          totalAmount={order.totalPrice}
          onClose={() => setShowTaxInvoiceModal(false)}
        />
      )}

      {/* 택배 조회 모달 */}
      {showTrackingModal && order && (order.trackingInfo || order.carrier) && (
        <TrackingInfoModal
          carrier={order.trackingInfo?.carrier || order.carrier || ''}
          trackingNumber={order.trackingInfo?.trackingNumber || order.trackingNumber || ''}
          onClose={() => setShowTrackingModal(false)}
        />
      )}
    </div>
  )
}
