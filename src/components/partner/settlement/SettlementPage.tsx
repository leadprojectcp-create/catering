'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'
import styles from './SettlementPage.module.css'

interface OrderItem {
  id: string
  orderId: string
  productName: string
  totalProductPrice: number
  orderDate: Date
  orderNumber: number // 몇 번째 주문인지
  settlementStatus?: 'pending' | 'completed' // 정산 상태
  settlementDate?: Date // 정산 완료 날짜
  settlementId?: string // 정산 ID
}

interface SettlementAccount {
  bankCode: string
  bankName: string
  accountNumber: string
  holderName: string
}

type PeriodFilter = 'all' | 'daily' | 'weekly' | 'monthly' | 'custom'

export default function SettlementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [totalSettlement, setTotalSettlement] = useState(0)
  const [totalFee, setTotalFee] = useState(0)
  const [account, setAccount] = useState<SettlementAccount | null>(null)

  // 필터 상태
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectingStart, setSelectingStart] = useState(true)

  useEffect(() => {
    console.log('[SettlementPage] useEffect 실행, user:', user)
    if (user) {
      fetchOrders()
      fetchAccount()
    } else {
      console.log('[SettlementPage] user가 없습니다')
      setLoading(false)
    }
  }, [user])

  // 초기 날짜 필터 설정 (전체)
  useEffect(() => {
    handlePeriodFilter('all')
  }, [])

  const fetchAccount = async () => {
    if (!user) return

    try {
      const userRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const settlementAccount = userData?.settlementAccount

        if (settlementAccount) {
          setAccount({
            bankCode: settlementAccount.bankCode,
            bankName: settlementAccount.bankName,
            accountNumber: settlementAccount.accountNumber,
            holderName: settlementAccount.holderName
          })
        }
      }
    } catch (error) {
      console.error('[SettlementPage] 계좌 정보 조회 실패:', error)
    }
  }

  const fetchOrders = async () => {
    if (!user) {
      console.log('[SettlementPage] fetchOrders - user 없음')
      return
    }

    try {
      console.log('[SettlementPage] 주문 데이터 조회 시작')
      console.log('[SettlementPage] user.uid:', user.uid)
      setLoading(true)

      // orders 컬렉션에서 내가 판매한 완료된 주문 가져오기
      const ordersRef = collection(db, 'orders')
      console.log('[SettlementPage] ordersRef 생성 완료')

      // 먼저 partnerId로만 조회해서 데이터 확인
      console.log('[SettlementPage] 1단계: partnerId로만 조회')
      const q1 = query(ordersRef, where('partnerId', '==', user.uid))
      const snapshot1 = await getDocs(q1)
      console.log('[SettlementPage] partnerId로 조회된 주문 수:', snapshot1.size)
      snapshot1.forEach((doc) => {
        const data = doc.data()
        console.log('[SettlementPage] partnerId 일치하는 주문:', {
          id: doc.id,
          partnerId: data.partnerId,
          orderStatus: data.orderStatus,
          paymentStatus: data.paymentStatus,
          productName: data.items?.[0]?.productName || data.productName,
          totalProductPrice: data.totalProductPrice
        })
      })

      // orderBy 없이 조회 시도
      console.log('[SettlementPage] 2단계: orderBy 없이 전체 조건 조회')
      const q2 = query(
        ordersRef,
        where('partnerId', '==', user.uid),
        where('orderStatus', '==', 'completed'),
        where('paymentStatus', '==', 'paid')
      )
      const snapshot2 = await getDocs(q2)
      console.log('[SettlementPage] orderBy 없이 조회된 주문 수:', snapshot2.size)

      const ordersList: OrderItem[] = []
      let index = 0

      snapshot2.forEach((doc) => {
        const data = doc.data()
        const productName = data.items?.[0]?.productName || data.productName || '상품명 없음'

        console.log(`[SettlementPage] 주문 ${index + 1}:`, {
          id: doc.id,
          partnerId: data.partnerId,
          orderStatus: data.orderStatus,
          paymentStatus: data.paymentStatus,
          productName: productName,
          totalProductPrice: data.totalProductPrice,
          createdAt: data.createdAt
        })

        ordersList.push({
          id: doc.id,
          orderId: doc.id,
          productName: productName,
          totalProductPrice: data.totalProductPrice || 0,
          orderDate: data.createdAt?.toDate() || new Date(),
          orderNumber: index + 1,
          settlementStatus: data.settlementStatus || 'pending',
          settlementDate: data.settlementDate?.toDate(),
          settlementId: data.settlementId
        })

        index++
      })

      // 클라이언트에서 날짜순 정렬
      ordersList.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime())
      // orderNumber 재할당
      ordersList.forEach((order, index) => {
        order.orderNumber = index + 1
      })

      console.log('[SettlementPage] ordersList 총 개수:', ordersList.length)
      console.log('[SettlementPage] ordersList:', ordersList)

      setOrders(ordersList)
      calculateSettlement(ordersList)
    } catch (error) {
      console.error('[SettlementPage] 정산 내역 조회 실패:', error)
      if (error instanceof Error) {
        console.error('[SettlementPage] 에러 메시지:', error.message)
        console.error('[SettlementPage] 에러 스택:', error.stack)
      }
    } finally {
      setLoading(false)
      console.log('[SettlementPage] 로딩 완료')
    }
  }

  const calculateSettlement = (ordersList: OrderItem[]) => {
    console.log('[SettlementPage] calculateSettlement 시작, ordersList.length:', ordersList.length)
    let totalSettlementAmount = 0
    let totalFeeAmount = 0

    ordersList.forEach((order, index) => {
      const orderNumber = index + 1
      const feeRate = orderNumber <= 5 ? 0.034 : 0.134 // 1-5건: 3.4%, 6건 이상: 13.4%
      const fee = order.totalProductPrice * feeRate
      const settlementAmount = order.totalProductPrice - fee

      console.log(`[SettlementPage] 주문 #${orderNumber} 계산:`, {
        totalProductPrice: order.totalProductPrice,
        feeRate,
        fee,
        settlementAmount
      })

      totalSettlementAmount += settlementAmount
      totalFeeAmount += fee
    })

    console.log('[SettlementPage] 최종 계산 결과:', {
      totalSettlementAmount,
      totalFeeAmount
    })

    setTotalSettlement(totalSettlementAmount)
    setTotalFee(totalFeeAmount)
  }

  const calculateOrderSettlement = (order: OrderItem) => {
    const feeRate = order.orderNumber <= 5 ? 0.034 : 0.134
    const fee = order.totalProductPrice * feeRate
    const settlementAmount = order.totalProductPrice - fee

    return {
      fee,
      settlementAmount,
      feeRate: Math.round(feeRate * 1000) / 10 // 3.4 또는 13.4로 정확히 표시
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.floor(num))
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  }

  // 기간 필터 핸들러
  const handlePeriodFilter = (period: PeriodFilter) => {
    setPeriodFilter(period)
    if (period === 'custom') {
      setShowDatePicker(true)
    } else {
      setShowDatePicker(false)

      if (period === 'all') {
        setDateRange({ start: null, end: null })
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (period === 'daily') {
          setDateRange({ start: today, end: today })
        } else if (period === 'weekly') {
          const weekStart = new Date(today)
          weekStart.setDate(today.getDate() - today.getDay())
          const weekEnd = new Date(today)
          weekEnd.setDate(weekStart.getDate() + 6)
          setDateRange({ start: weekStart, end: weekEnd })
        } else if (period === 'monthly') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          setDateRange({ start: monthStart, end: monthEnd })
        }
      }
    }
  }

  // 날짜 범위 라벨
  const getDateRangeLabel = () => {
    if (!dateRange.start || !dateRange.end) return '기간 선택'
    const start = dateRange.start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    const end = dateRange.end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    return `${start} - ${end}`
  }

  // 달력 날짜 클릭
  const handleDateClick = (date: Date) => {
    if (selectingStart) {
      setDateRange({ start: date, end: null })
      setSelectingStart(false)
    } else {
      if (dateRange.start && date >= dateRange.start) {
        setDateRange({ ...dateRange, end: date })
        setShowDatePicker(false)
        setSelectingStart(true)
        setPeriodFilter('custom')
      } else {
        setDateRange({ start: date, end: null })
      }
    }
  }

  // 날짜 범위 초기화
  const clearDateRange = () => {
    setDateRange({ start: null, end: null })
    setSelectingStart(true)
    setPeriodFilter('all')
    handlePeriodFilter('all')
  }

  // 날짜 범위 체크
  const isDateInRange = (date: Date) => {
    if (!dateRange.start || !dateRange.end) return false
    return date >= dateRange.start && date <= dateRange.end
  }

  // 선택된 날짜 체크
  const isDateSelected = (date: Date) => {
    if (!dateRange.start && !dateRange.end) return false
    if (dateRange.start && date.toDateString() === dateRange.start.toDateString()) return true
    if (dateRange.end && date.toDateString() === dateRange.end.toDateString()) return true
    return false
  }

  // 달력 렌더링 헬퍼
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

  // 날짜 필터링된 주문
  const filteredOrders = orders.filter(order => {
    if (!dateRange.start || !dateRange.end) return true

    const orderDate = new Date(order.orderDate)
    orderDate.setHours(0, 0, 0, 0)

    const startDate = new Date(dateRange.start)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(dateRange.end)
    endDate.setHours(23, 59, 59, 999)

    return orderDate >= startDate && orderDate <= endDate
  })

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>정산 내역</h1>

      <div className={styles.summarySection}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>총 판매 금액</div>
          <div className={styles.summaryValue}>
            {formatNumber(orders.reduce((sum, order) => sum + order.totalProductPrice, 0))}원
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>총 수수료</div>
          <div className={styles.summaryValue}>
            -{formatNumber(totalFee)}원
          </div>
        </div>
        <div className={styles.summaryCard + ' ' + styles.highlight}>
          <div className={styles.summaryLabel}>정산 받을 금액</div>
          <div className={styles.summaryValue}>
            {formatNumber(totalSettlement)}원
          </div>
        </div>
      </div>

      {/* 계좌 정보 섹션 */}
      <div className={styles.accountInfoSection}>
        <div className={styles.accountInfoLeft}>
          <div className={styles.accountInfoItem}>
            <div className={styles.accountInfoLabel}>은행명</div>
            <div className={styles.accountInfoValue}>
              {account ? (
                <>
                  <img
                    src={`/bank/${account.bankCode}.png`}
                    alt={account.bankName}
                    className={styles.bankLogo}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  {account.bankName}
                </>
              ) : (
                '-'
              )}
            </div>
          </div>
          <div className={styles.accountInfoItem}>
            <div className={styles.accountInfoLabel}>예금주</div>
            <div className={styles.accountInfoValue}>{account?.holderName || '-'}</div>
          </div>
          <div className={styles.accountInfoItem}>
            <div className={styles.accountInfoLabel}>계좌번호</div>
            <div className={styles.accountInfoValue}>{account?.accountNumber || '-'}</div>
          </div>
        </div>
        <button
          className={styles.registerAccountButton}
          onClick={() => router.push('/partner/settlement-accounts')}
        >
          정산계좌 등록하기
        </button>
      </div>

      <div className={styles.ordersSection}>
        <div className={styles.ordersSectionHeader}>
          <h2 className={styles.sectionTitle}>주문 내역 ({filteredOrders.length}건)</h2>

          <div className={styles.filterButtons}>
            <button
              className={`${styles.periodButton} ${periodFilter === 'all' ? styles.active : ''}`}
              onClick={() => handlePeriodFilter('all')}
            >
              전체
            </button>
            <button
              className={`${styles.periodButton} ${periodFilter === 'daily' ? styles.active : ''}`}
              onClick={() => handlePeriodFilter('daily')}
            >
              일별
            </button>
            <button
              className={`${styles.periodButton} ${periodFilter === 'weekly' ? styles.active : ''}`}
              onClick={() => handlePeriodFilter('weekly')}
            >
              주별
            </button>
            <button
              className={`${styles.periodButton} ${periodFilter === 'monthly' ? styles.active : ''}`}
              onClick={() => handlePeriodFilter('monthly')}
            >
              월별
            </button>

            {/* 기간 선택 */}
            <div className={styles.dropdownContainer}>
              <div
                className={styles.dropdown}
                onClick={() => {
                  setShowDatePicker(!showDatePicker)
                  if (!showDatePicker) {
                    setPeriodFilter('custom')
                  }
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

        {filteredOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>정산 가능한 주문이 없습니다.</p>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {filteredOrders.map((order) => {
              const { fee, settlementAmount, feeRate } = calculateOrderSettlement(order)

              return (
                <div key={order.id} className={styles.orderItem}>
                  <div className={styles.orderHeader}>
                    <div className={styles.orderNumber}>
                      주문 #{order.orderNumber}
                      {order.orderNumber <= 5 && (
                        <span className={styles.specialBadge}>프로모션 수수료</span>
                      )}
                      {order.settlementStatus === 'completed' ? (
                        <span className={styles.completedBadge}>정산완료</span>
                      ) : (
                        <span className={styles.pendingBadge}>정산대기</span>
                      )}
                    </div>
                    <div className={styles.orderDate}>
                      {formatDate(order.orderDate)}
                      {order.settlementDate && order.settlementStatus === 'completed' && (
                        <span className={styles.settlementDateText}>
                          (정산일: {formatDate(order.settlementDate)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.orderContent}>
                    <div className={styles.productName}>{order.productName}</div>
                    <div className={styles.priceInfo}>
                      <div className={styles.priceRow}>
                        <span>상품 금액</span>
                        <span>{formatNumber(order.totalProductPrice)}원</span>
                      </div>
                      <div className={styles.priceRow + ' ' + styles.fee}>
                        <span>수수료 ({feeRate}%)</span>
                        <span>-{formatNumber(fee)}원</span>
                      </div>
                      <div className={styles.priceRow + ' ' + styles.settlement}>
                        <span>정산 금액</span>
                        <span className={styles.settlementAmount}>
                          {formatNumber(settlementAmount)}원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
