'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/lib/services/orderService'
import type { Order, OrderStatus } from '@/lib/services/orderService'
import type { Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, orderBy as firestoreOrderBy, onSnapshot } from 'firebase/firestore'
import { createOrGetChatRoom } from '@/lib/services/chatService'
import Loading from '@/components/Loading'
import OrderFilterTabs from './sections/OrderFilterTabs'
import OrderFilterOptions from './sections/OrderFilterOptions'
import OrderList from './sections/OrderList'
import OrderCancelModal from './modals/OrderCancelModal'
import TrackingNumberModal from './modals/TrackingNumberModal'
import PrintOrderSheet from './components/PrintOrderSheet'
import styles from './OrderManagementPage.module.css'

type FilterStatus = 'all' | 'pending' | 'cancelled_rejected' | 'preparing' | 'shipping' | 'completed'
type DeliveryMethodFilter = 'all' | '퀵업체 배송' | '택배 배송' | '매장 픽업'

export default function OrderManagementPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<DeliveryMethodFilter>('all')
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)
  const [driverInfo, setDriverInfo] = useState<{ [orderId: string]: { rName: string; rMobile: string } }>({})

  useEffect(() => {
    console.log('=== URL 파라미터 읽기 ===')
    console.log('searchParams:', searchParams.toString())

    // URL 파라미터에서 filter 값 읽기
    const filterParam = searchParams.get('filter')
    console.log('filterParam:', filterParam)
    if (filterParam && ['all', 'pending', 'cancelled_rejected', 'preparing', 'shipping', 'completed'].includes(filterParam)) {
      setFilter(filterParam as FilterStatus)
    }

    // URL 파라미터에서 배송 방법 필터 읽기
    const deliveryParam = searchParams.get('delivery')
    console.log('deliveryParam:', deliveryParam)
    if (deliveryParam && ['all', '퀵업체 배송', '택배 배송', '매장 픽업'].includes(deliveryParam)) {
      setDeliveryMethodFilter(deliveryParam as DeliveryMethodFilter)
    }

    // URL 파라미터에서 날짜 범위 읽기
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    console.log('날짜 파라미터:', { startDateParam, endDateParam })

    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam)
      const endDate = new Date(endDateParam)
      console.log('날짜 파싱 결과:', { startDate, endDate })

      setDateRange({
        start: startDate,
        end: endDate
      })
    }
  }, [searchParams])

  useEffect(() => {
    // 현재 사용자의 storeId 가져오기 및 실시간 리스너 설정
    const user = auth.currentUser
    if (!user) return

    // Firestore 실시간 리스너 설정
    const ordersQuery = query(
      collection(db, 'orders'),
      where('storeId', '==', user.uid),
      firestoreOrderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        console.log('=== Firestore 실시간 업데이트 수신 ===')
        console.log('변경된 문서 수:', snapshot.docChanges().length)
        snapshot.docChanges().forEach(change => {
          if (change.type === 'modified') {
            console.log('수정된 주문:', change.doc.id, change.doc.data())
          }
        })

        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[]
        console.log('전체 주문 수:', ordersData.length)
        setOrders(ordersData)
        setLoading(false)
      },
      (error) => {
        console.error('주문 목록 실시간 로드 실패:', error)
        setLoading(false)
      }
    )

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe()
  }, [])

  const updateURL = (updates: {
    filter?: FilterStatus
    delivery?: DeliveryMethodFilter
    startDate?: Date | null
    endDate?: Date | null
  }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (updates.filter !== undefined) {
      params.set('filter', updates.filter)
    }
    if (updates.delivery !== undefined) {
      params.set('delivery', updates.delivery)
    }
    if (updates.startDate !== undefined && updates.endDate !== undefined) {
      if (updates.startDate && updates.endDate) {
        params.set('startDate', updates.startDate.toISOString().split('T')[0])
        params.set('endDate', updates.endDate.toISOString().split('T')[0])
      } else {
        params.delete('startDate')
        params.delete('endDate')
      }
    }

    router.push(`/partner/order/history?${params.toString()}`)
  }

  const handleFilterChange = (newFilter: FilterStatus) => {
    setFilter(newFilter)
    updateURL({ filter: newFilter })
  }

  const handleDeliveryFilterChange = (newDelivery: DeliveryMethodFilter) => {
    setDeliveryMethodFilter(newDelivery)
    updateURL({ delivery: newDelivery })
  }

  const handleDateRangeChange = (range: { start: Date | null; end: Date | null }) => {
    console.log('날짜 범위 변경:', {
      start: range.start?.toLocaleDateString('ko-KR'),
      end: range.end?.toLocaleDateString('ko-KR')
    })
    setDateRange(range)
    updateURL({ startDate: range.start, endDate: range.end })
  }

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: '신규 주문',
      preparing: '준비중',
      shipping: '배송·픽업중',
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

      // 상태 변경 후 해당 탭으로 이동
      handleFilterChange(newStatus as FilterStatus)
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

  const handleTrackingSubmit = async (carrier: string, trackingNumber: string) => {
    if (!trackingOrderId) return

    try {
      console.log('=== 택배 정보 저장 시작 ===')
      console.log('주문 ID:', trackingOrderId)
      console.log('택배사:', carrier)
      console.log('송장번호:', trackingNumber)

      await updateOrderStatus(trackingOrderId, 'shipping', undefined, carrier, trackingNumber)

      console.log('상태 업데이트 완료, 로컬 state 업데이트 시작')
      setOrders(orders.map(o => o.id === trackingOrderId ? { ...o, orderStatus: 'shipping', carrier, trackingNumber } : o))

      // 필터를 '배송·픽업중' 탭으로 자동 변경
      setFilter('shipping')
      updateURL({ filter: 'shipping' })

      setShowTrackingModal(false)
      setTrackingOrderId(null)
      alert('택배 정보가 저장되고 주문 상태가 변경되었습니다.')
      console.log('=== 택배 정보 저장 완료 ===')
    } catch (error) {
      console.error('택배 정보 저장 실패:', error)
      alert('택배 정보 저장에 실패했습니다.')
    }
  }

  const handleTrackingModalClose = () => {
    setShowTrackingModal(false)
    setTrackingOrderId(null)
  }

  const handleChatClick = async (order: Order) => {
    const user = auth.currentUser
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!order.uid) {
      alert('고객 정보를 불러올 수 없습니다.')
      return
    }

    try {
      // 고객(uid)의 정보 가져오기
      const userDoc = await getDoc(doc(db, 'users', order.uid))
      let userName = '고객'
      if (userDoc.exists()) {
        const userData = userDoc.data()
        userName = userData.name || '고객'
      }

      const roomId = await createOrGetChatRoom(
        user.uid,
        order.storeId,
        userName,
        order.uid
      )
      router.push(`/chat?roomId=${roomId}`)
    } catch (error) {
      console.error('채팅방 생성 실패:', error)
      alert('채팅방 생성에 실패했습니다.')
    }
  }

  const handleOrderDetailClick = async (orderId: string | undefined) => {
    if (!orderId) return

    const isExpanding = expandedOrderId !== orderId
    setExpandedOrderId(isExpanding ? orderId : null)

    // 퀵 배송 주문이고 확장할 때만 기사 정보 조회
    if (isExpanding) {
      const order = orders.find(o => o.id === orderId)
      if (order?.deliveryMethod === '퀵업체 배송' && order.quickDeliveryOrderNo && !driverInfo[orderId]) {
        await fetchDriverInfo(orderId, order)
      }
    }
  }

  const fetchDriverInfo = async (orderId: string, order: Order) => {
    try {
      // 주문 생성일을 기준으로 조회 범위 설정 (생성일 ±1일)
      const createdAt = order.createdAt && typeof order.createdAt === 'object' && 'toDate' in order.createdAt
        ? (order.createdAt as Timestamp).toDate()
        : new Date(order.createdAt as string | number | Date)

      const rangeStart = new Date(createdAt)
      rangeStart.setDate(rangeStart.getDate() - 1)
      const rangeEnd = new Date(createdAt)
      rangeEnd.setDate(rangeEnd.getDate() + 1)

      const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const response = await fetch('/api/quick-delivery/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rangeStart: formatDate(rangeStart),
          rangeEnd: formatDate(rangeEnd),
          orderNo: order.quickDeliveryOrderNo,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.order && data.order.rName) {
          setDriverInfo(prev => ({
            ...prev,
            [orderId]: {
              rName: data.order.rName,
              rMobile: data.order.rMobile,
            }
          }))
        }
      }
    } catch (error) {
      console.error('기사 정보 조회 실패:', error)
    }
  }

  // Calculate filtered orders count for display
  console.log('=== 필터링 시작 ===')
  console.log('전체 주문 수:', orders.length)
  console.log('날짜 범위:', dateRange)

  const filteredOrders = orders.filter(order => {
    // 결제 완료된 주문만 표시
    if (order.paymentStatus !== 'paid') {
      return false
    }

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

    // 날짜 필터 (주문 생성일 기준)
    if (dateRange.start && dateRange.end) {
      if (!order.createdAt) {
        console.log('주문에 createdAt이 없음:', order.orderNumber)
        return true // createdAt이 없으면 필터링하지 않음
      }

      // createdAt이 Firestore Timestamp인 경우와 Date인 경우 모두 처리
      let orderDate: Date
      if (typeof order.createdAt === 'object' && order.createdAt && 'toDate' in order.createdAt) {
        orderDate = (order.createdAt as Timestamp).toDate()
      } else {
        orderDate = new Date(order.createdAt as string | number | Date)
      }

      // 날짜만 비교 (시간 제외)
      const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
      const startDateOnly = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate())
      const endDateOnly = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate())

      console.log('날짜 필터 비교:', {
        orderNumber: order.orderNumber,
        orderDateOnly: orderDateOnly.toLocaleDateString('ko-KR'),
        startDateOnly: startDateOnly.toLocaleDateString('ko-KR'),
        endDateOnly: endDateOnly.toLocaleDateString('ko-KR'),
        isInRange: orderDateOnly >= startDateOnly && orderDateOnly <= endDateOnly
      })

      if (orderDateOnly < startDateOnly || orderDateOnly > endDateOnly) {
        return false
      }
    }

    return true
  })


  if (loading) {
    return <Loading />
  }

  return (
    <>
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>주문내역</h1>

        <div className={styles.filtersWrapper}>
          <OrderFilterTabs filter={filter} orders={orders} onFilterChange={handleFilterChange} />
          <OrderFilterOptions
            deliveryMethodFilter={deliveryMethodFilter}
            dateRange={dateRange}
            onDeliveryFilterChange={handleDeliveryFilterChange}
            onDateRangeChange={handleDateRangeChange}
          />
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

      <OrderList
        orders={filteredOrders}
        filter={filter}
        deliveryMethodFilter={deliveryMethodFilter}
        dateRange={dateRange}
        expandedOrderId={expandedOrderId}
        driverInfo={driverInfo}
        onToggleExpand={(orderId) => handleOrderDetailClick(orderId)}
        onStatusUpdate={handleStatusChange}
        onOpenCancelModal={(orderId) => handleCancelClick(orderId)}
        onOpenTrackingModal={(orderId) => { setTrackingOrderId(orderId); setShowTrackingModal(true) }}
        onOpenChat={handleChatClick}
        onPrint={() => window.print()}
      />

      {/* 주문취소 모달 */}
      <OrderCancelModal
        isOpen={showCancelModal}
        onClose={handleCancelModalClose}
        onConfirm={handleCancelConfirm}
      />

      {/* 택배 정보 입력 모달 */}
      {showTrackingModal && (
        <TrackingNumberModal
          onClose={handleTrackingModalClose}
          onSubmit={handleTrackingSubmit}
        />
      )}

    </div>

    {/* 인쇄용 주문서 (화면에는 안 보이고 인쇄할 때만 표시) */}
    {expandedOrderId && (
      <PrintOrderSheet
        order={orders.find(o => o.id === expandedOrderId)!}
        driverInfo={driverInfo[expandedOrderId] || null}
      />
    )}
    </>
  )
}
