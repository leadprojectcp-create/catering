'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { addCartItem } from '@/lib/services/cartService'
import Loading from '@/components/Loading'
import OrderCancelModal from './OrderCancelModal'
import TaxInvoiceModal from './TaxInvoiceModal'
import styles from './OrderDetailPage.module.css'

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
  productImage?: string
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

interface Order {
  id: string
  uid: string
  storeId: string
  storeName: string
  items: OrderItem[]
  totalPrice: number
  totalProductPrice: number
  deliveryFee: number
  orderStatus: string
  paymentStatus: string
  deliveryMethod: string
  deliveryInfo?: DeliveryInfo
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
  createdAt: Date
  paidAt?: Date
  payMethod?: string
  usedPoint?: number
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

// 결제수단 표시 변환 함수
const getPayMethodName = (payMethod?: string): string => {
  if (!payMethod) return '알 수 없음'

  const payMethodMap: { [key: string]: string } = {
    'card': '신용카드',
    'trans': '퀵계좌이체',
    'vbank': '가상계좌',
    'payco': 'PAYCO',
    'samsung': 'SAMSUNG PAY',
    'kakao': '카카오페이',
    'naver': '네이버페이',
    'toss': '토스페이',
    'apple': 'APPLE PAY'
  }

  return payMethodMap[payMethod] || payMethod
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false)

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
        createdAt: new Date(),
        updatedAt: new Date()
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

          {/* 주문 상태 및 정보 */}
          <div className={styles.orderBasicInfo}>
            <div className={styles.statusText}>
              {getStatusText(order.orderStatus, order.paymentStatus)}
            </div>
            <div className={styles.orderInfoRow}>
              <span className={styles.orderInfoLabel}>주문번호</span>
              <span className={styles.orderInfoValue}>{order.orderNumber || order.id}</span>
            </div>
            <div className={styles.orderInfoRow}>
              <span className={styles.orderInfoLabel}>주문날짜</span>
              <span className={styles.orderInfoValue}>
                {order.createdAt.toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true
                })}
              </span>
            </div>
            <div className={styles.orderInfoRow}>
              <span className={styles.orderInfoLabel}>예약날짜</span>
              <span className={styles.orderInfoValue}>
                {order.deliveryInfo?.deliveryDate || order.deliveryDate} {order.deliveryInfo?.deliveryTime || order.deliveryTime}
              </span>
            </div>
            <div className={styles.orderInfoRow}>
              <span className={styles.orderInfoLabel}>결제상태</span>
              <span className={styles.paymentInfo}>
                {order.paymentStatus === 'paid' ? '결제완료' : '결제 미완료'} {order.totalPrice.toLocaleString()}원
              </span>
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* 상품 목록 */}
          {(() => {
            const groupedItems: { [key: string]: OrderItem[] } = {}
            order.items.forEach(item => {
              if (!groupedItems[item.productName]) {
                groupedItems[item.productName] = []
              }
              groupedItems[item.productName].push(item)
            })

            return Object.entries(groupedItems).map(([productName, items], groupIndex) => {
              const firstItem = items[0]
              return (
                <div key={groupIndex} className={styles.productItem}>
                  {firstItem.productImage && (
                    <Image
                      src={firstItem.productImage}
                      alt={productName}
                      width={100}
                      height={100}
                      quality={100}
                      className={styles.productImage}
                    />
                  )}

                  <div className={styles.productInfo}>
                    <div className={styles.productName}>{productName}</div>

                    {items.map((item, itemIndex) => {
                      const itemTotalPrice = item.price * item.quantity
                      return (
                        <div key={itemIndex} className={styles.productDetailsBox}>
                          <div className={styles.productDetailsLeft}>
                            {/* 상품 옵션 */}
                            {Object.keys(item.options).length > 0 && (
                              <div className={styles.optionSection}>
                                <div className={styles.optionSectionTitle}>상품 옵션</div>
                                <div className={styles.productOptions}>
                                  {Object.entries(item.options).map(([key, value]) => {
                                    let optionPrice = 0
                                    if (item.optionsWithPrices && item.optionsWithPrices[key]) {
                                      optionPrice = item.optionsWithPrices[key].price
                                    }
                                    return (
                                      <div key={key} className={styles.optionItem}>
                                        <span className={styles.optionGroup}>[{key}]</span>
                                        <span>{value} +{optionPrice.toLocaleString()}원</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 추가상품 */}
                            {item.additionalOptions && Object.keys(item.additionalOptions).length > 0 && (
                              <div className={styles.optionSection}>
                                <div className={styles.optionSectionTitle}>추가상품</div>
                                <div className={styles.productOptions}>
                                  {Object.entries(item.additionalOptions).map(([key, value]) => {
                                    let optionPrice = 0
                                    if (item.additionalOptionsWithPrices && item.additionalOptionsWithPrices[key]) {
                                      optionPrice = item.additionalOptionsWithPrices[key].price
                                    }
                                    return (
                                      <div key={key} className={styles.optionItem}>
                                        <span className={styles.optionGroup}>[{key}]</span>
                                        <span>{value} +{optionPrice.toLocaleString()}원</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className={styles.productDetailsRight}>
                            <div className={styles.quantityInfo}>{item.quantity}개</div>
                            <div className={styles.priceInfo}>{itemTotalPrice.toLocaleString()}원</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          })()}

          {order.request && (
            <>
              <div className={styles.divider}></div>
              <div className={styles.requestSection}>
                <div className={styles.requestLabel}>매장 요청사항</div>
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
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>주소</span>
                <span className={styles.infoValue}>
                  {order.deliveryInfo?.address || order.address}
                  {(order.deliveryInfo?.detailAddress || order.detailAddress) && ` ${order.deliveryInfo?.detailAddress || order.detailAddress}`}
                </span>
              </div>
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
              <span className={styles.infoValue}>+{order.deliveryFee.toLocaleString()}원</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>포인트 사용</span>
              <span className={styles.infoValue}>-{(order.usedPoint ?? 0).toLocaleString()}원</span>
            </div>
            <div className={styles.divider}></div>
            {order.paidAt && (
              <div className={styles.paymentDateInfo}>
                {new Date(order.paidAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  weekday: 'short'
                }).replace(/\. /g, '.').replace(/\.$/, '')} {new Date(order.paidAt).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })} {getPayMethodName(order.payMethod)} 결제
              </div>
            )}
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
                주문취소
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
                  주문취소
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 주문 취소 모달 */}
      {cancelOrderId && (
        <OrderCancelModal
          orderId={cancelOrderId}
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
    </div>
  )
}
