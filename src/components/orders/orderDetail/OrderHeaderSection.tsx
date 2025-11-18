'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createOrGetChatRoom } from '@/lib/services/chatService'
import type { Order } from './types'
import styles from '../OrderDetailPage.module.css'

interface Props {
  order: Order
  user: { uid: string } | null
}

// Helper functions
const getStatusText = (orderStatus: string, paymentStatus: string) => {
  if (paymentStatus === 'unpaid') return '결제 미완료'
  if (paymentStatus === 'failed') return '결제 실패'
  if (orderStatus === 'pending') return '업체 승인 대기'
  if (orderStatus === 'rejected') return '판매자 취소'
  if (orderStatus === 'preparing') return '준비 중'
  if (orderStatus === 'shipping') return '배송 중'
  if (orderStatus === 'completed') return '완료'
  if (orderStatus === 'cancelled') return '고객 취소'
  if (orderStatus === 'cancelled_before_accept') return '고객 취소'

  return '알 수 없음'
}

const formatDeliveryDateTime = (dateStr: string, timeStr?: string) => {
  // dateStr 형식: "2025년 11월 3일" 또는 "2025-11-03 00:00" 등
  // timeStr 형식: "오후 2시 30분" 등
  try {
    // "2025년 11월 3일" 형식 파싱
    const match = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
    if (match) {
      const [, year, month, day] = match
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' })

      if (timeStr) {
        return `${dateStr} (${weekday}) ${timeStr}`
      }
      return `${dateStr} (${weekday})`
    }

    // "2025-11-03 00:00" 형식 파싱
    const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/)
    if (isoMatch) {
      const [, year, month, day, hour, minute] = isoMatch
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' })

      const formattedDate = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`

      if (hour && minute) {
        const hourNum = parseInt(hour)
        const isPM = hourNum >= 12
        const displayHour = hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum)
        const period = isPM ? '오후' : '오전'
        const formattedTime = `${period} ${displayHour}시 ${minute}분`
        return `${formattedDate} (${weekday}) ${formattedTime}`
      }

      if (timeStr) {
        return `${formattedDate} (${weekday}) ${timeStr}`
      }
      return `${formattedDate} (${weekday})`
    }

    return timeStr ? `${dateStr} ${timeStr}` : dateStr
  } catch (error) {
    return timeStr ? `${dateStr} ${timeStr}` : dateStr
  }
}

export default function OrderHeaderSection({ order, user }: Props) {
  const router = useRouter()

  const handleChatClick = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    if (!order.partnerId) {
      alert('판매자 정보를 불러오는 중입니다.')
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

  const handleStoreClick = () => {
    if (order.storeId) {
      router.push(`/store/${order.storeId}`)
    }
  }

  return (
    <div className={styles.sectionWrapper}>
      <h2 className={styles.sectionTitle}>주문 내역</h2>

      <section className={styles.orderDetailSection}>
        <div className={styles.orderHeader}>
          <div className={styles.orderHeaderLeft}>
            <div className={styles.storeName} onClick={handleStoreClick}>
              {order.storeName}
              <Image src="/icons/arrow.svg" alt="arrow" width={16} height={16} />
            </div>
            <div className={styles.statusText}>
              {getStatusText(order.orderStatus, order.paymentStatus)}
            </div>
            <div className={styles.orderInfoRow}>
              <span className={styles.orderInfoLabel}>예약날짜</span>
              <span className={styles.orderInfoValue}>
                {formatDeliveryDateTime(
                  order.deliveryInfo?.deliveryDate || order.deliveryDate || '',
                  order.deliveryInfo?.deliveryTime || order.deliveryTime
                )}
              </span>
            </div>
            <div className={`${styles.orderInfoRow} ${styles.orderNumberRow}`}>
              <span className={styles.orderInfoLabel}>주문번호</span>
              <span className={styles.orderInfoValue}>{order.orderNumber || order.id}</span>
            </div>
          </div>

          <div className={styles.orderHeaderRight}>
            <button className={styles.actionButton} onClick={handleChatClick}>
              <Image src="/icons/chat.png" alt="채팅" width={20} height={20} />
              <span>채팅</span>
            </button>
            {order.partnerPhone && (
              <a
                href={`tel:${order.partnerPhone}`}
                className={styles.actionButton}
              >
                <Image src="/icons/phone.png" alt="전화" width={20} height={20} />
                <span>전화</span>
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
