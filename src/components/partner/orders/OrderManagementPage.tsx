'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getStoreOrders, updateOrderStatus } from '@/lib/services/orderService'
import type { Order, OrderStatus } from '@/lib/services/orderService'
import type { Timestamp, FieldValue } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { createOrGetChatRoom } from '@/lib/services/chatService'
import { ChevronDown, Calendar } from 'lucide-react'
import Image from 'next/image'
import Loading from '@/components/Loading'
import OrderCancelModal from './OrderCancelModal'
import styles from './OrderManagementPage.module.css'

type FilterStatus = 'all' | 'pending' | 'cancelled_rejected' | 'preparing' | 'shipping' | 'completed'
type DeliveryMethodFilter = 'all' | '퀵업체 배송' | '매장 픽업'

export default function OrderManagementPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [storeId, setStoreId] = useState<string>('')
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<DeliveryMethodFilter>('all')
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectingStart, setSelectingStart] = useState(true)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)

  useEffect(() => {
    // URL 파라미터에서 filter 값 읽기
    const filterParam = searchParams.get('filter')
    if (filterParam && ['all', 'pending', 'cancelled_rejected', 'preparing', 'shipping', 'completed'].includes(filterParam)) {
      setFilter(filterParam as FilterStatus)
    }
  }, [searchParams])

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
      preparing: '준비중',
      shipping: '배송중',
      completed: '완료',
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

  const handleCancelClick = (orderId: string) => {
    setCancelOrderId(orderId)
    setShowCancelModal(true)
  }

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelOrderId) return

    try {
      await updateOrderStatus(cancelOrderId, 'rejected', reason)
      setOrders(orders.map(o => o.id === cancelOrderId ? { ...o, orderStatus: 'rejected', cancelReason: reason } : o))
      setShowCancelModal(false)
      setCancelOrderId(null)
      alert(`주문이 취소되었습니다.\n취소 사유: ${reason}`)
    } catch (error) {
      console.error('주문 취소 실패:', error)
      alert('주문 취소에 실패했습니다.')
    }
  }

  const handleCancelModalClose = () => {
    setShowCancelModal(false)
    setCancelOrderId(null)
  }

  const handleChatClick = async (order: Order) => {
    const user = auth.currentUser
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!order.userId) {
      alert('고객 정보를 불러올 수 없습니다.')
      return
    }

    try {
      // 고객(userId)의 정보 가져오기
      const userDoc = await getDoc(doc(db, 'users', order.userId))
      let userName = '고객'
      if (userDoc.exists()) {
        const userData = userDoc.data()
        userName = userData.name || '고객'
      }

      const roomId = await createOrGetChatRoom(
        user.uid,
        order.storeId,
        userName,
        order.userId
      )
      router.push(`/chat?roomId=${roomId}`)
    } catch (error) {
      console.error('채팅방 생성 실패:', error)
      alert('채팅방 생성에 실패했습니다.')
    }
  }

  const handlePhoneClick = (order: Order) => {
    if (!order.phone) {
      alert('전화번호가 없습니다.')
      return
    }
    window.location.href = `tel:${order.phone}`
  }

  const handleOrderDetailClick = (orderId: string | undefined) => {
    if (!orderId) return
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
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
    return new Intl.NumberFormat('ko-KR').format(amount) + '원'
  }

  const filteredOrders = orders.filter(order => {
    // 주문 상태 필터
    if (filter !== 'all') {
      if (filter === 'cancelled_rejected') {
        if (order.orderStatus !== 'rejected' && order.orderStatus !== 'cancelled') return false
      } else if (order.orderStatus !== filter) {
        return false
      }
    }

    // 배송 방법 필터
    if (deliveryMethodFilter !== 'all' && order.deliveryMethod !== deliveryMethodFilter) {
      return false
    }

    // 날짜 필터
    if (dateRange.start && dateRange.end) {
      const orderDate = new Date(order.deliveryDate)
      if (orderDate < dateRange.start || orderDate > dateRange.end) {
        return false
      }
    }

    return true
  })

  const getDeliveryMethodLabel = () => {
    if (deliveryMethodFilter === 'all') return '주문유형선택'
    return deliveryMethodFilter
  }

  const getDateRangeLabel = () => {
    if (!dateRange.start || !dateRange.end) return '기간 선택'
    const start = dateRange.start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    const end = dateRange.end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    return `${start} - ${end}`
  }

  const handleDateClick = (date: Date) => {
    if (selectingStart) {
      setDateRange({ start: date, end: null })
      setSelectingStart(false)
    } else {
      if (dateRange.start && date >= dateRange.start) {
        setDateRange({ ...dateRange, end: date })
        setShowDatePicker(false)
        setSelectingStart(true)
      } else {
        setDateRange({ start: date, end: null })
      }
    }
  }

  const clearDateRange = () => {
    setDateRange({ start: null, end: null })
    setSelectingStart(true)
  }

  const isDateInRange = (date: Date) => {
    if (!dateRange.start || !dateRange.end) return false
    return date >= dateRange.start && date <= dateRange.end
  }

  const isDateSelected = (date: Date) => {
    if (!dateRange.start && !dateRange.end) return false
    if (dateRange.start && date.toDateString() === dateRange.start.toDateString()) return true
    if (dateRange.end && date.toDateString() === dateRange.end.toDateString()) return true
    return false
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)
    const days = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay}></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const isSelected = isDateSelected(date)
      const inRange = isDateInRange(date)

      days.push(
        <div
          key={day}
          className={`${styles.day} ${isSelected ? styles.selectedDate : ''} ${inRange ? styles.inRange : ''}`}
          onClick={() => handleDateClick(date)}
        >
          <span>{day}</span>
        </div>
      )
    }

    return days
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>주문내역</h1>

        <div className={styles.filtersWrapper}>
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              전체 <span className={styles.filterCount}>{orders.length}건</span>
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
              onClick={() => setFilter('pending')}
            >
              신규 주문 <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'pending').length}건</span>
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'cancelled_rejected' ? styles.active : ''}`}
              onClick={() => setFilter('cancelled_rejected')}
            >
              주문 취소 <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'rejected' || o.orderStatus === 'cancelled').length}건</span>
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'preparing' ? styles.active : ''}`}
              onClick={() => setFilter('preparing')}
            >
              준비중 <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'preparing').length}건</span>
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'shipping' ? styles.active : ''}`}
              onClick={() => setFilter('shipping')}
            >
              배송·픽업중 <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'shipping').length}건</span>
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
              onClick={() => setFilter('completed')}
            >
              완료 <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'completed').length}건</span>
            </button>
          </div>

          {/* 조건 조회 */}
          <div className={styles.filterOptions}>
            {/* 주문 유형 선택 */}
            <div className={styles.dropdownContainer}>
              <div
                className={styles.dropdown}
                onClick={() => {
                  setShowDeliveryDropdown(!showDeliveryDropdown)
                  setShowDatePicker(false)
                }}
              >
                <span className={styles.dropdownText}>{getDeliveryMethodLabel()}</span>
                <ChevronDown size={16} className={styles.chevronIcon} />
              </div>
              {showDeliveryDropdown && (
                <div className={styles.dropdownMenu}>
                  <div
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDeliveryMethodFilter('all')
                      setShowDeliveryDropdown(false)
                    }}
                  >
                    전체
                  </div>
                  <div
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDeliveryMethodFilter('퀵업체 배송')
                      setShowDeliveryDropdown(false)
                    }}
                  >
                    퀵업체 배송
                  </div>
                  <div
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDeliveryMethodFilter('매장 픽업')
                      setShowDeliveryDropdown(false)
                    }}
                  >
                    매장 픽업
                  </div>
                </div>
              )}
            </div>

            {/* 기간 선택 */}
            <div className={styles.dropdownContainer}>
              <div
                className={styles.dropdown}
                onClick={() => {
                  setShowDatePicker(!showDatePicker)
                  setShowDeliveryDropdown(false)
                }}
              >
                <span className={styles.dropdownText}>{getDateRangeLabel()}</span>
                <Calendar size={16} className={styles.chevronIcon} />
              </div>
              {showDatePicker && (
                <div className={styles.calendar}>
                  <div className={styles.calendarHeader}>
                    <button className={styles.navButton} onClick={goToPreviousMonth}>‹</button>
                    <span className={styles.monthYear}>
                      {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                    </span>
                    <button className={styles.navButton} onClick={goToNextMonth}>›</button>
                  </div>
                  <div className={styles.weekdays}>
                    <div className={styles.weekday}>일</div>
                    <div className={styles.weekday}>월</div>
                    <div className={styles.weekday}>화</div>
                    <div className={styles.weekday}>수</div>
                    <div className={styles.weekday}>목</div>
                    <div className={styles.weekday}>금</div>
                    <div className={styles.weekday}>토</div>
                  </div>
                  <div className={styles.days}>
                    {renderCalendar()}
                  </div>
                  <div className={styles.calendarFooter}>
                    <button className={styles.clearButton} onClick={clearDateRange}>
                      초기화
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.orderListHeader}>
        {filter === 'all' && '전체'}
        {filter === 'pending' && '신규주문'}
        {filter === 'cancelled_rejected' && '주문 취소'}
        {filter === 'preparing' && '준비중'}
        {filter === 'shipping' && '배송·픽업중'}
        {filter === 'completed' && '완료'}
        {' '}{filteredOrders.length}개
      </div>

      {filteredOrders.length === 0 ? (
        <div className={styles.empty}>
          주문이 없습니다.
        </div>
      ) : (
        <div className={styles.orderList}>
            {filteredOrders.map((order) => {
              // 배송 날짜와 시간 가져오기 (deliveryInfo 우선, 없으면 기본 필드)
              const actualDeliveryDate = order.deliveryInfo?.deliveryDate || order.deliveryDate
              const actualDeliveryTime = order.deliveryInfo?.deliveryTime || order.deliveryTime

              // D-day 계산
              let dDay = '-'
              let formattedReservation = '-'

              if (actualDeliveryDate) {
                const deliveryDateObj = new Date(actualDeliveryDate)
                const today = new Date()
                const diffTime = deliveryDateObj.getTime() - today.getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                dDay = diffDays >= 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`

                // 예약날짜 포맷
                const year = deliveryDateObj.getFullYear()
                const month = deliveryDateObj.getMonth() + 1
                const day = deliveryDateObj.getDate()
                const weekdays = ['일', '월', '화', '수', '목', '금', '토']
                const weekday = weekdays[deliveryDateObj.getDay()]

                formattedReservation = `${year}년 ${month}월 ${day}일 (${weekday})`

                if (actualDeliveryTime) {
                  const [hour, minute] = actualDeliveryTime.split(':').map(Number)
                  const period = hour >= 12 ? '오후' : '오전'
                  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                  formattedReservation += ` ${period} ${displayHour}시 ${minute}분`
                }
              }

              // 상품명 요약
              const firstProduct = order.items[0]?.productName || ''
              const totalCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
              const productSummary = `${firstProduct} 외 ${totalCount}개`

              // 배송방법 텍스트
              const deliveryMethodText = order.deliveryMethod === '퀵업체 배송' ? '퀵업체 배송' : '매장 픽업'

              // 주문 상태 텍스트 및 스타일
              const getOrderStatusBadge = () => {
                let statusText = ''
                let statusClass = ''

                switch (order.orderStatus) {
                  case 'pending':
                    statusText = '신규주문'
                    statusClass = styles.statusPending
                    break
                  case 'preparing':
                    statusText = '준비중'
                    statusClass = styles.statusPreparing
                    break
                  case 'shipping':
                    statusText = '배송·픽업중'
                    statusClass = styles.statusShipping
                    break
                  case 'completed':
                    statusText = '완료'
                    statusClass = styles.statusCompleted
                    break
                  case 'rejected':
                  case 'cancelled':
                    statusText = '주문취소'
                    statusClass = styles.statusCancelled
                    break
                  default:
                    statusText = order.orderStatus
                    statusClass = ''
                }

                return <div className={`${styles.statusBadge} ${statusClass}`}>{statusText}</div>
              }

              return (
                <div key={order.id} className={`${styles.orderCard} ${expandedOrderId === order.id ? styles.orderCardExpanded : ''}`}>
                  <div className={styles.cardContentWrapper}>
                    <div className={styles.cardLeft}>
                      <div className={styles.orderHeader}>
                        {getOrderStatusBadge()}
                        <div className={styles.deliveryBadge}>{deliveryMethodText}</div>
                        <div className={styles.dDay}>{dDay}</div>
                        <span className={styles.orderNumberText}>주문번호 {order.orderNumber || order.id}</span>
                      </div>
                      <div className={styles.productName}>{productSummary}</div>
                      <div className={styles.orderInfo}>예약날짜 {formattedReservation}</div>
                      <div className={styles.orderInfo}>
                        결제완료 {order.deliveryMethod === '퀵업체 배송'
                          ? formatCurrency(order.totalPrice - order.deliveryFee)
                          : formatCurrency(order.totalPrice)
                        }
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <div className={styles.actionRow}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleChatClick(order)}
                        >
                          <Image
                            src="/partner-menu-icons/chat.png"
                            alt="채팅"
                            width={16}
                            height={16}
                            quality={100}
                            unoptimized
                          />
                          채팅
                        </button>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handlePhoneClick(order)}
                        >
                          <Image
                            src="/icons/phone.png"
                            alt="전화"
                            width={16}
                            height={16}
                            quality={100}
                            unoptimized
                          />
                          전화
                        </button>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleOrderDetailClick(order.id)}
                        >
                          <Image
                            src="/partner-menu-icons/order.png"
                            alt="주문상세"
                            width={16}
                            height={16}
                            quality={100}
                            unoptimized
                          />
                          주문상세
                        </button>
                      </div>
                      {(order.orderStatus === 'pending' || order.orderStatus === 'preparing' || order.orderStatus === 'shipping') && order.id && (
                        <div className={styles.actionRow}>
                          {order.orderStatus === 'pending' && (
                            <>
                              <button
                                className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                onClick={() => handleCancelClick(order.id!)}
                              >
                                주문취소
                              </button>
                              <button
                                className={`${styles.actionBtn} ${styles.acceptBtn}`}
                                onClick={() => handleStatusChange(order.id!, 'preparing')}
                              >
                                주문접수
                              </button>
                            </>
                          )}
                          {order.orderStatus === 'preparing' && (
                            <>
                              <button
                                className={`${styles.actionBtn} ${styles.cancelBtn}`}
                                onClick={() => handleCancelClick(order.id!)}
                              >
                                주문취소
                              </button>
                              <button
                                className={`${styles.actionBtn} ${styles.acceptBtn}`}
                                onClick={() => handleStatusChange(order.id!, 'shipping')}
                              >
                                배송·픽업중
                              </button>
                            </>
                          )}
                          {order.orderStatus === 'shipping' && (
                            <button
                              className={`${styles.actionBtn} ${styles.acceptBtn}`}
                              onClick={() => handleStatusChange(order.id!, 'completed')}
                            >
                              완료
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 주문 상세 정보 */}
                  {expandedOrderId === order.id && (
                    <div className={styles.orderDetails}>
                      <div className={styles.detailsLeft}>
                        <div className={styles.detailCard}>
                          <h3 className={styles.detailTitle}>주문정보</h3>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>주문일시</span>
                            <span className={styles.detailValue}>{formatDate(order.createdAt)}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>주문번호</span>
                            <span className={styles.detailValue}>{order.orderNumber || order.id}</span>
                          </div>

                          <div className={styles.detailSectionDivider}></div>

                          <h3 className={styles.detailTitle}>주문내역</h3>
                          {order.items.map((item, index) => (
                            <div key={index} className={styles.orderItemSection}>
                              <div className={styles.orderItemHeader}>
                                <span className={styles.orderItemName}>{item.productName}</span>
                                <span className={styles.orderItemQuantity}>{item.quantity}개</span>
                                <span className={styles.orderItemPrice}>{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                              {Object.entries(item.options).map(([key, value], optIdx) => (
                                <div key={optIdx} className={styles.orderItemOption}>
                                  [{key}] {value}
                                </div>
                              ))}
                            </div>
                          ))}

                          <div className={styles.detailSectionDivider}></div>

                          <div className={styles.totalSection}>
                            <div className={styles.totalRow}>
                              <span className={styles.totalLabel}>총 상품갯수</span>
                              <span className={styles.totalValue}>{order.items.reduce((sum, item) => sum + item.quantity, 0)}개</span>
                            </div>
                            <div className={styles.totalRow}>
                              <span className={styles.totalLabel}>총 결제금액</span>
                              <span className={styles.totalValue}>
                                {order.deliveryMethod === '퀵업체 배송'
                                  ? formatCurrency(order.totalPrice - order.deliveryFee)
                                  : formatCurrency(order.totalPrice)
                                }
                              </span>
                            </div>
                          </div>

                          <div className={styles.detailSectionDivider}></div>

                          <h3 className={styles.detailTitle}>매장요청</h3>
                          <div className={styles.requestText}>
                            {order.request || order.detailedRequest || '요청사항이 없습니다.'}
                          </div>
                        </div>
                      </div>

                      <div className={styles.detailsRight}>
                        {order.deliveryMethod === '퀵업체 배송' ? (
                          <>
                            {/* 퀵업체 배송 */}
                            <div className={styles.detailCard}>
                              <h3 className={styles.detailTitle}>배송날짜</h3>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>배송날짜</span>
                                <span className={styles.detailValue}>
                                  {actualDeliveryDate ? (() => {
                                    const date = new Date(actualDeliveryDate)
                                    const year = date.getFullYear()
                                    const month = date.getMonth() + 1
                                    const day = date.getDate()
                                    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
                                    const weekday = weekdays[date.getDay()]
                                    return `${year}년 ${month}월 ${day}일 (${weekday})`
                                  })() : '-'}
                                </span>
                              </div>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>배송시간</span>
                                <span className={styles.detailValue}>
                                  {actualDeliveryTime ? (() => {
                                    const [hour, minute] = actualDeliveryTime.split(':').map(Number)
                                    const period = hour >= 12 ? '오후' : '오전'
                                    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                                    return `${period} ${displayHour}시 ${minute}분`
                                  })() : '-'}
                                </span>
                              </div>

                              <div className={styles.detailSectionDivider}></div>

                              <h3 className={styles.detailTitle}>배송정보</h3>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>배송방법</span>
                                <span className={styles.detailValue}>퀵 업체 배송</span>
                              </div>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>배송주소</span>
                                <span className={styles.detailValue}>{order.address}</span>
                              </div>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>상세주소</span>
                                <span className={styles.detailValue}>{order.detailAddress || '-'}</span>
                              </div>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>수령인</span>
                                <span className={styles.detailValue}>{order.recipient}</span>
                              </div>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>전화번호</span>
                                <span className={styles.detailValue}>{order.phone}</span>
                              </div>

                              <div className={styles.detailSectionDivider}></div>

                              <h3 className={styles.detailTitle}>배송요청</h3>
                              <div className={styles.requestText}>
                                {order.request || order.detailedRequest || '요청사항이 없습니다.'}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* 매장 픽업 */}
                            <div className={styles.detailCard}>
                              <h3 className={styles.detailTitle}>픽업날짜</h3>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>픽업날짜</span>
                                <span className={styles.detailValue}>
                                  {actualDeliveryDate ? (() => {
                                    const date = new Date(actualDeliveryDate)
                                    const year = date.getFullYear()
                                    const month = date.getMonth() + 1
                                    const day = date.getDate()
                                    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
                                    const weekday = weekdays[date.getDay()]
                                    return `${year}년 ${month}월 ${day}일 (${weekday})`
                                  })() : '-'}
                                </span>
                              </div>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>픽업시간</span>
                                <span className={styles.detailValue}>
                                  {actualDeliveryTime ? (() => {
                                    const [hour, minute] = actualDeliveryTime.split(':').map(Number)
                                    const period = hour >= 12 ? '오후' : '오전'
                                    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                                    return `${period} ${displayHour}시 ${minute}분`
                                  })() : '-'}
                                </span>
                              </div>

                              <div className={styles.detailSectionDivider}></div>

                              <h3 className={styles.detailTitle}>수령인 정보</h3>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>수령인</span>
                                <span className={styles.detailValue}>{order.recipient}</span>
                              </div>
                              <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>전화번호</span>
                                <span className={styles.detailValue}>{order.phone}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {/* 주문취소 모달 */}
      <OrderCancelModal
        isOpen={showCancelModal}
        onClose={handleCancelModalClose}
        onConfirm={handleCancelConfirm}
      />
    </div>
  )
}
