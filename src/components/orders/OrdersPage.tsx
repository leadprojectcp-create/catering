'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { collection, query, where, orderBy, getDocs, doc, getDoc, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { createOrGetChatRoom } from '@/lib/services/chatService'
import { addCartItem } from '@/lib/services/cartService'
import Loading from '@/components/Loading'
import OrderCancelModal from './OrderCancelModal'
import CashReceiptModal from './CashReceiptModal'
import TaxInvoiceModal from './TaxInvoiceModal'
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
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
  deliveryDate: string
  deliveryTime: string
  address?: string
  detailAddress?: string
  recipient?: string
  orderer: string
  phone: string
  request?: string
  detailedRequest?: string
  paymentId?: string
  transactionId?: string
  orderNumber?: string
  createdAt: Date
  paidAt?: Date
  hasReview?: boolean
  deliveryInfo?: {
    addressName?: string
    deliveryDate?: string
    deliveryTime?: string
    address?: string
    detailAddress?: string
    recipient?: string
    recipientPhone?: string
    deliveryRequest?: string
    detailedRequest?: string
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cashReceiptOrder, setCashReceiptOrder] = useState<{ orderId: string; paymentId: string } | null>(null)
  const [taxInvoiceOrder, setTaxInvoiceOrder] = useState<{ orderId: string; paymentId: string; totalAmount: number } | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'pending' | 'preparing' | 'shipping' | 'completed' | 'cancelled'>('all')
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<'all' | '퀵업체 배송' | '매장 픽업'>('all')
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [tempDateRange, setTempDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const datePickerRef = useRef<HTMLDivElement>(null)
  const deliveryDropdownRef = useRef<HTMLDivElement>(null)
  const [selectingStart, setSelectingStart] = useState(true)

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
          where('uid', '==', user.uid),
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

          // 리뷰 존재 여부 확인
          let hasReview = false
          if (data.orderStatus === 'completed') {
            try {
              const reviewsRef = collection(db, 'reviews')
              const reviewQuery = query(
                reviewsRef,
                where('uid', '==', user.uid),
                where('orderId', '==', docSnapshot.id),
                limit(1)
              )
              const reviewSnapshot = await getDocs(reviewQuery)
              hasReview = !reviewSnapshot.empty
            } catch (error) {
              console.error('리뷰 확인 실패:', error)
            }
          }

          ordersData.push({
            id: docSnapshot.id,
            ...data,
            partnerId: partnerId,
            partnerPhone: storePhone,
            items: itemsWithImages,
            createdAt: data.createdAt?.toDate() || new Date(),
            paidAt: data.paidAt?.toDate(),
            hasReview: hasReview,
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

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
      if (deliveryDropdownRef.current && !deliveryDropdownRef.current.contains(event.target as Node)) {
        setShowDeliveryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getStatusText = (orderStatus: string, paymentStatus: string) => {
    // 결제 상태 우선 체크
    if (paymentStatus === 'unpaid') return '결제 미완료'
    if (paymentStatus === 'failed') return '결제 실패'
    if (paymentStatus === 'refunded') return '환불됨'

    // 주문 상태 체크
    if (orderStatus === 'pending') return '주문 확인 대기'
    if (orderStatus === 'rejected') return '업체 거부'
    if (orderStatus === 'preparing') return '준비 중'
    if (orderStatus === 'shipping') return '배송·픽업중'
    if (orderStatus === 'completed') return '완료'
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
    if (orderStatus === 'rejected') return '#f44336'
    if (orderStatus === 'preparing') return '#FF9800'
    if (orderStatus === 'shipping') return '#9C27B0'
    if (orderStatus === 'completed') return '#4CAF50'
    if (orderStatus === 'cancelled') return '#f44336'

    return '#999'
  }

  const filteredOrders = orders.filter((order) => {
    // 상태 필터
    let statusMatch = true
    if (filterStatus === 'unpaid') {
      statusMatch = order.paymentStatus === 'unpaid' || order.paymentStatus === 'failed'
    } else if (filterStatus === 'pending') {
      statusMatch = order.paymentStatus === 'paid' && order.orderStatus === 'pending'
    } else if (filterStatus === 'preparing') {
      statusMatch = order.paymentStatus === 'paid' && order.orderStatus === 'preparing'
    } else if (filterStatus === 'shipping') {
      statusMatch = order.paymentStatus === 'paid' && order.orderStatus === 'shipping'
    } else if (filterStatus === 'completed') {
      statusMatch = order.paymentStatus === 'paid' && order.orderStatus === 'completed'
    } else if (filterStatus === 'cancelled') {
      statusMatch = order.orderStatus === 'cancelled' || order.orderStatus === 'rejected' || order.paymentStatus === 'refunded'
    }

    // 배송 방법 필터
    const deliveryMatch = deliveryMethodFilter === 'all' || order.deliveryMethod === deliveryMethodFilter

    // 날짜 범위 필터
    let dateMatch = true
    if (dateRange.start && dateRange.end) {
      const orderDate = order.createdAt
      dateMatch = orderDate >= dateRange.start && orderDate <= dateRange.end
    }

    return statusMatch && deliveryMatch && dateMatch
  })

  const getDeliveryMethodLabel = () => {
    if (deliveryMethodFilter === 'all') return '주문유형 선택'
    return deliveryMethodFilter
  }

  const getDateRangeLabel = () => {
    if (!tempDateRange.start || !tempDateRange.end) return '기간 선택'

    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const weekdays = ['일', '월', '화', '수', '목', '금', '토']
      const weekday = weekdays[date.getDay()]
      return `${year}.${month}.${day}(${weekday})`
    }

    const daysDiff = Math.ceil((tempDateRange.end.getTime() - tempDateRange.start.getTime()) / (1000 * 60 * 60 * 24))

    let periodText = ''
    if (daysDiff === 6) {
      periodText = '최근 7일 '
    } else if (daysDiff === 29 || daysDiff === 30) {
      periodText = '최근 1개월 '
    } else if (daysDiff === 89 || daysDiff === 90 || daysDiff === 91) {
      periodText = '최근 3개월 '
    }

    return `${periodText}${formatDate(tempDateRange.start)} ~ ${formatDate(tempDateRange.end)}`
  }

  const handleDateClick = (date: Date) => {
    if (selectingStart) {
      setTempDateRange({ start: date, end: null })
      setSelectingStart(false)
    } else {
      if (tempDateRange.start && date < tempDateRange.start) {
        setTempDateRange({ start: date, end: tempDateRange.start })
      } else {
        setTempDateRange({ start: tempDateRange.start, end: date })
      }
      setSelectingStart(true)
      setShowDatePicker(false)
    }
  }

  const applyDateRange = () => {
    setDateRange(tempDateRange)
    setShowDatePicker(false)
  }

  const resetDateRange = () => {
    setDateRange({ start: null, end: null })
    setTempDateRange({ start: null, end: null })
    setSelectingStart(true)
  }

  const isDateInRange = (date: Date) => {
    if (!tempDateRange.start || !tempDateRange.end) return false
    return date >= tempDateRange.start && date <= tempDateRange.end
  }

  const isDateSelected = (date: Date) => {
    if (!tempDateRange.start && !tempDateRange.end) return false
    if (tempDateRange.start && date.toDateString() === tempDateRange.start.toDateString()) return true
    if (tempDateRange.end && date.toDateString() === tempDateRange.end.toDateString()) return true
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

  const formatReservationDateTime = (dateStr: string, timeStr: string) => {
    try {
      // dateStr이 "2025-01-15" 형식이라고 가정
      const [year, month, day] = dateStr.split('-').map(Number)
      const date = new Date(year, month - 1, day)

      const weekdays = ['일', '월', '화', '수', '목', '금', '토']
      const weekday = weekdays[date.getDay()]

      return `${year}년 ${month}월 ${day}일 (${weekday}) ${timeStr}`
    } catch (error) {
      return `${dateStr} ${timeStr}`
    }
  }

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

  const handleReviewClick = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    try {
      // 해당 주문에 대한 리뷰가 이미 존재하는지 확인
      const reviewsRef = collection(db, 'reviews')
      const q = query(
        reviewsRef,
        where('uid', '==', user.uid),
        where('orderId', '==', orderId),
        limit(1)
      )
      const reviewSnapshot = await getDocs(q)

      if (!reviewSnapshot.empty) {
        // 이미 리뷰를 작성한 경우
        alert('리뷰 작성을 완료했습니다. 감사합니다.')
        return
      }

      // 리뷰가 없으면 작성 페이지로 이동
      router.push(`/reviews/write?orderId=${orderId}`)
    } catch (error) {
      console.error('리뷰 확인 실패:', error)
      alert('리뷰 확인에 실패했습니다.')
    }
  }

  if (authLoading || loading) {
    return <Loading />
  }

  return (
    <>
      <div className={styles.container}>
        <h1 className={styles.title}>주문 내역</h1>

        {/* 필터 */}
        <div className={styles.filtersWrapper}>
          <div className={styles.filters}>
          <button
            className={filterStatus === 'all' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('all')}
          >
            전체 <span className={styles.filterCount}>{orders.length}건</span>
          </button>
          <button
            className={filterStatus === 'unpaid' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('unpaid')}
          >
            결제대기 <span className={styles.filterCount}>{orders.filter(o => o.paymentStatus === 'unpaid' || o.paymentStatus === 'failed').length}건</span>
          </button>
          <button
            className={filterStatus === 'pending' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('pending')}
          >
            주문확인대기 <span className={styles.filterCount}>{orders.filter(o => o.paymentStatus === 'paid' && o.orderStatus === 'pending').length}건</span>
          </button>
          <button
            className={filterStatus === 'preparing' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('preparing')}
          >
            준비중 <span className={styles.filterCount}>{orders.filter(o => o.paymentStatus === 'paid' && o.orderStatus === 'preparing').length}건</span>
          </button>
          <button
            className={filterStatus === 'shipping' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('shipping')}
          >
            배송·픽업중 <span className={styles.filterCount}>{orders.filter(o => o.paymentStatus === 'paid' && o.orderStatus === 'shipping').length}건</span>
          </button>
          <button
            className={filterStatus === 'completed' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('completed')}
          >
            완료 <span className={styles.filterCount}>{orders.filter(o => o.paymentStatus === 'paid' && o.orderStatus === 'completed').length}건</span>
          </button>
          <button
            className={filterStatus === 'cancelled' ? styles.filterActive : styles.filterButton}
            onClick={() => setFilterStatus('cancelled')}
          >
            주문취소 <span className={styles.filterCount}>{orders.filter(o => o.orderStatus === 'cancelled' || o.orderStatus === 'rejected' || o.paymentStatus === 'refunded').length}건</span>
          </button>
          </div>

          {/* 조건 조회 */}
          <div className={styles.filterOptions}>
            {/* 주문 유형 선택 */}
            <div className={styles.dropdownContainer} ref={deliveryDropdownRef}>
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
            <div className={`${styles.dropdownContainer} ${styles.dateDropdownContainer}`} ref={datePickerRef}>
              <div
                className={`${styles.dropdown} ${styles.dateDropdown}`}
                onClick={() => {
                  setShowDatePicker(!showDatePicker)
                  setShowDeliveryDropdown(false)
                }}
              >
                <span className={styles.dropdownText}>
                  {getDateRangeLabel()}
                </span>
                <Calendar size={16} className={styles.chevronIcon} />
              </div>
              {showDatePicker && (
                <div className={styles.calendar}>
                  <div className={styles.calendarHeader}>
                    <button onClick={goToPreviousMonth} className={styles.navButton}>
                      <ChevronLeft size={20} />
                    </button>
                    <span className={styles.monthYear}>
                      {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                    </span>
                    <button onClick={goToNextMonth} className={styles.navButton}>
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <div className={styles.calendarGrid}>
                    <div className={styles.weekdays}>
                      {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <div key={day} className={styles.weekday}>
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className={styles.days}>{renderCalendar()}</div>
                  </div>
                  <div className={styles.calendarFooter}>
                    <button onClick={resetDateRange} className={styles.clearButton}>
                      초기화
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 주문 내역 조회 버튼 */}
            <button onClick={applyDateRange} className={styles.searchButton}>
              주문 내역 조회
            </button>
          </div>
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

                <div className={styles.orderNumber}>주문번호 {order.orderNumber}</div>

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
                          {formatReservationDateTime(
                            order.deliveryInfo?.deliveryDate || order.deliveryDate,
                            order.deliveryInfo?.deliveryTime || order.deliveryTime
                          )}
                        </div>
                        <div className={`${styles.deliveryMethod} ${
                          order.deliveryMethod === '퀵업체 배송'
                            ? styles.deliveryMethodQuick
                            : order.deliveryMethod === '매장 픽업'
                            ? styles.deliveryMethodPickup
                            : ''
                        }`}>
                          {order.deliveryMethod}
                        </div>
                        <div className={`${styles.orderTotal} ${order.paymentStatus === 'failed' ? styles.orderTotalFailed : ''}`}>
                          {(!order.paymentStatus || order.paymentStatus === 'unpaid') && `결제 미완료 ${(order.totalPrice || order.totalProductPrice || 0).toLocaleString()}원`}
                          {order.paymentStatus === 'paid' && `결제 완료 ${(order.totalPrice || order.totalProductPrice || 0).toLocaleString()}원`}
                          {order.paymentStatus === 'refunded' && `환불됨 ${(order.totalPrice || order.totalProductPrice || 0).toLocaleString()}원`}
                          {order.paymentStatus === 'failed' && `결제 실패 ${(order.totalPrice || order.totalProductPrice || 0).toLocaleString()}원`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.buttonGroup}>
                  {order.orderStatus === 'completed' ? (
                    <>
                      <button
                        className={styles.detailButton}
                        onClick={(e) => handleAddToCart(order, e)}
                      >
                        장바구니 담기
                      </button>
                      <button
                        className={styles.receiptButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!order.paymentId) {
                            alert('결제 정보가 없습니다.')
                            return
                          }
                          setCashReceiptOrder({ orderId: order.id, paymentId: order.paymentId })
                        }}
                      >
                        현금영수증
                      </button>
                      <button
                        className={styles.taxInvoiceButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!order.paymentId) {
                            alert('결제 정보가 없습니다.')
                            return
                          }
                          setTaxInvoiceOrder({
                            orderId: order.id,
                            paymentId: order.paymentId,
                            totalAmount: order.totalPrice,
                          })
                        }}
                      >
                        세금계산서
                      </button>
                      {order.hasReview ? (
                        <button
                          className={styles.reviewButton}
                          disabled
                          style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        >
                          작성완료
                        </button>
                      ) : (
                        <button
                          className={styles.reviewButton}
                          onClick={(e) => handleReviewClick(order.id, e)}
                        >
                          리뷰작성
                        </button>
                      )}
                    </>
                  ) : (order.paymentStatus === 'unpaid' || order.paymentStatus === 'failed') ? (
                    <>
                      <button
                        className={styles.cancelButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCancelOrderId(order.id)
                        }}
                      >
                        주문취소
                      </button>
                      <button
                        className={styles.detailButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/orders/${order.id}`)
                        }}
                      >
                        주문상세
                      </button>
                      <button
                        className={styles.payButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/payments?orderId=${order.id}`)
                        }}
                      >
                        결제하기
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

      {/* 현금영수증 발급 모달 */}
      {cashReceiptOrder && (
        <CashReceiptModal
          orderId={cashReceiptOrder.orderId}
          paymentId={cashReceiptOrder.paymentId}
          onClose={() => setCashReceiptOrder(null)}
          onSuccess={() => {
            // 현금영수증 발급 성공
          }}
        />
      )}

      {/* 세금계산서 발급 모달 */}
      {taxInvoiceOrder && (
        <TaxInvoiceModal
          isOpen={!!taxInvoiceOrder}
          onClose={() => setTaxInvoiceOrder(null)}
          orderId={taxInvoiceOrder.orderId}
          paymentId={taxInvoiceOrder.paymentId}
          totalAmount={taxInvoiceOrder.totalAmount}
        />
      )}
    </>
  )
}
