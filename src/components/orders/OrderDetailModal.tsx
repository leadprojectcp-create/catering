'use client'

import styles from './OrderDetailModal.module.css'

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

interface OrderDetailModalProps {
  order: Order
  onClose: () => void
}

export default function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>주문 상세</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
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

        <div className={styles.footer}>
          <button className={styles.closeBtn} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
