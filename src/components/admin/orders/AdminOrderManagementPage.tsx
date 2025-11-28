'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/lib/services/orderService'
import type { Order, OrderStatus } from '@/lib/services/orderService'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, orderBy as firestoreOrderBy, onSnapshot } from 'firebase/firestore'
import Loading from '@/components/Loading'
import OrderFilterTabs from '@/components/partner/orders/sections/OrderFilterTabs'
import OrderFilterOptions from '@/components/partner/orders/sections/OrderFilterOptions'
import OrderList from '@/components/partner/orders/sections/OrderList'
import OrderCancelModal from '@/components/partner/orders/modals/OrderCancelModal'
import TrackingNumberModal from '@/components/partner/orders/modals/TrackingNumberModal'
import PrintOrderSheet from '@/components/partner/orders/components/PrintOrderSheet'
import styles from './AdminOrderManagementPage.module.css'

type FilterStatus = 'all' | 'pending' | 'cancelled_rejected' | 'preparing' | 'shipping' | 'completed'
type DeliveryMethodFilter = 'all' | '퀵업체 배송' | '택배 배송' | '매장 픽업'

export default function AdminOrderManagementPage() {
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
  const [cancelPaymentId, setCancelPaymentId] = useState<string | null>(null)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)
  const [driverInfo, setDriverInfo] = useState<{ [orderId: string]: { rName: string; rMobile: string } }>({})
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [stores, setStores] = useState<{ id: string; storeName: string }[]>([])

  useEffect(() => {
    // URL 파라미터에서 filter 값 읽기
    const filterParam = searchParams.get('filter')
    if (filterParam && ['all', 'pending', 'cancelled_rejected', 'preparing', 'shipping', 'completed'].includes(filterParam)) {
      setFilter(filterParam as FilterStatus)
    }

    // URL 파라미터에서 배송 방법 필터 읽기
    const deliveryParam = searchParams.get('delivery')
    if (deliveryParam && ['all', '퀵업체 배송', '택배 배송', '매장 픽업'].includes(deliveryParam)) {
      setDeliveryMethodFilter(deliveryParam as DeliveryMethodFilter)
    }

    // URL 파라미터에서 날짜 범위 읽기
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam)
      const endDate = new Date(endDateParam)
      setDateRange({
        start: startDate,
        end: endDate
      })
    }

    // URL 파라미터에서 스토어 필터 읽기
    const storeParam = searchParams.get('store')
    if (storeParam) {
      setStoreFilter(storeParam)
    }
  }, [searchParams])

  // 모든 주문 실시간 리스너
  useEffect(() => {
    // 관리자용: 모든 주문 가져오기 (storeId 필터 없음)
    const ordersQuery = query(
      collection(db, 'orders'),
      firestoreOrderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[]
        setOrders(ordersData)
        setLoading(false)

        // 스토어 목록 추출 (중복 제거)
        const storeMap = new Map<string, string>()
        ordersData.forEach(order => {
          if (order.storeId && order.storeName && !storeMap.has(order.storeId)) {
            storeMap.set(order.storeId, order.storeName)
          }
        })
        const storeList = Array.from(storeMap.entries()).map(([id, storeName]) => ({ id, storeName }))
        storeList.sort((a, b) => a.storeName.localeCompare(b.storeName))
        setStores(storeList)
      },
      (error) => {
        console.error('주문 목록 실시간 로드 실패:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const updateURL = (updates: {
    filter?: FilterStatus
    delivery?: DeliveryMethodFilter
    startDate?: Date | null
    endDate?: Date | null
    store?: string
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
    if (updates.store !== undefined) {
      if (updates.store === 'all') {
        params.delete('store')
      } else {
        params.set('store', updates.store)
      }
    }

    router.push(`/admin/orders?${params.toString()}`)
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
    setDateRange(range)
    updateURL({ startDate: range.start, endDate: range.end })
  }

  const handleStoreFilterChange = (newStore: string) => {
    setStoreFilter(newStore)
    updateURL({ store: newStore })
  }

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      pending: '신규 주문',
      preparing: '준비중',
      shipping: '배송·픽업중',
      completed: '완료',
      rejected: '판매자 취소',
      cancelled: '고객 취소',
      cancelled_before_accept: '고객 취소'
    }
    return labels[status] || status
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!orderId) return

    if (!confirm(`주문 상태를 ${getStatusLabel(newStatus)}(으)로 변경하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status: newStatus,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '상태 변경에 실패했습니다.')
      }

      setOrders(orders.map(o => o.id === orderId ? { ...o, orderStatus: newStatus } : o))
      alert('주문 상태가 변경되었습니다.')
      handleFilterChange(newStatus as FilterStatus)
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert(error instanceof Error ? error.message : '상태 변경에 실패했습니다.')
    }
  }

  const handleCancelClick = (orderId: string) => {
    setCancelOrderId(orderId)
    setCancelPaymentId(null)
    setShowCancelModal(true)
  }

  const handleCancelAdditionalOrderClick = (paymentId: string) => {
    const order = orders.find(o =>
      o.items.some(item => item.paymentId === paymentId)
    )
    if (order && order.id) {
      setCancelOrderId(order.id)
      setCancelPaymentId(paymentId)
      setShowCancelModal(true)
    }
  }

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelOrderId) return

    const order = orders.find(o => o.id === cancelOrderId)
    if (!order) {
      alert('주문 정보를 찾을 수 없습니다.')
      return
    }

    try {
      if (cancelPaymentId) {
        // 추가주문 취소
        const targetItems = order.items.filter(item => item.paymentId === cancelPaymentId)
        const targetOrderAmount = targetItems.reduce((sum, item) => {
          return sum + (item.itemPrice || (item.price * item.quantity))
        }, 0)

        const paymentInfo = order.paymentInfo?.find(info => info.id === cancelPaymentId)
        if (!paymentInfo) {
          throw new Error('결제 정보를 찾을 수 없습니다.')
        }

        const refundAmount = typeof paymentInfo.amount === 'object' && paymentInfo.amount?.total
          ? paymentInfo.amount.total
          : (paymentInfo.amount as number)

        const cancelResponse = await fetch('/api/payments/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId: cancelPaymentId,
            reason: reason,
            refundAmount: refundAmount,
            isPartnerCancel: true,
            isPartialCancel: true,
          }),
        })

        const cancelData = await cancelResponse.json()
        if (!cancelData.success) {
          throw new Error(cancelData.error || '결제 취소에 실패했습니다.')
        }

        setShowCancelModal(false)
        setCancelOrderId(null)
        setCancelPaymentId(null)
        alert(`추가주문이 취소되었습니다.\n취소 사유: ${reason}\n환불 금액: ${targetOrderAmount.toLocaleString()}원`)
        window.location.reload()
        return
      }

      // 전체 주문 취소
      if (order.paymentId && order.paymentId.length > 0) {
        const paymentIds = Array.isArray(order.paymentId) ? order.paymentId : [order.paymentId]

        const notCancelledPaymentIds = paymentIds.filter(pid => {
          const paymentInfo = order.paymentInfo?.find(p => p.id === pid)
          return paymentInfo?.status !== 'cancelled'
        })

        for (const paymentId of notCancelledPaymentIds) {
          const itemsForPayment = order.items.filter(item => item.paymentId === paymentId)
          const productAmount = itemsForPayment.reduce((sum, item) => {
            return sum + (item.itemPrice || (item.price * item.quantity))
          }, 0)

          const isFirstPayment = paymentId === notCancelledPaymentIds[0]
          const refundAmount = isFirstPayment ? productAmount + (order.deliveryFee || 0) : productAmount

          const cancelResponse = await fetch('/api/payments/cancel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentId: paymentId,
              reason: reason,
              refundAmount: refundAmount,
              isPartnerCancel: true,
            }),
          })

          const cancelData = await cancelResponse.json()

          if (!cancelData.success) {
            throw new Error(cancelData.error || '결제 취소에 실패했습니다.')
          }
        }
      }

      await updateOrderStatus(cancelOrderId, 'rejected', reason)
      setOrders(orders.map(o => o.id === cancelOrderId ? { ...o, orderStatus: 'rejected', cancelReason: reason } : o))
      setShowCancelModal(false)
      setCancelOrderId(null)
      setCancelPaymentId(null)

      const paymentIds = Array.isArray(order.paymentId) ? order.paymentId : [order.paymentId]
      const notCancelledPaymentIds = paymentIds.filter(pid => {
        const paymentInfo = order.paymentInfo?.find(p => p.id === pid)
        return paymentInfo?.status !== 'cancelled'
      })
      const actualRefundAmount = order.items
        .filter(item => notCancelledPaymentIds.includes(item.paymentId || ''))
        .reduce((sum, item) => sum + (item.itemPrice || (item.price * item.quantity)), 0)

      if (actualRefundAmount > 0) {
        alert(`주문이 취소되었습니다.\n취소 사유: ${reason}\n환불 금액: ${actualRefundAmount.toLocaleString()}원`)
      } else {
        alert(`주문이 취소되었습니다.\n취소 사유: ${reason}`)
      }
    } catch (error) {
      console.error('주문 취소 실패:', error)
      alert(error instanceof Error ? error.message : '주문 취소에 실패했습니다.')
    }
  }

  const handleCancelModalClose = () => {
    setShowCancelModal(false)
    setCancelOrderId(null)
    setCancelPaymentId(null)
  }

  const handleTrackingSubmit = async (carrier: string, trackingNumber: string) => {
    if (!trackingOrderId) return

    try {
      const trackingInfo = {
        carrier,
        trackingNumber
      }

      const response = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: trackingOrderId,
          status: 'shipping',
          trackingInfo,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '상태 변경에 실패했습니다.')
      }

      setOrders(orders.map(o => o.id === trackingOrderId ? { ...o, orderStatus: 'shipping', trackingInfo } : o))
      setFilter('shipping')
      updateURL({ filter: 'shipping' })
      setShowTrackingModal(false)
      setTrackingOrderId(null)
      alert('택배 정보가 저장되고 주문 상태가 변경되었습니다.')
    } catch (error) {
      console.error('택배 정보 저장 실패:', error)
      alert(error instanceof Error ? error.message : '택배 정보 저장에 실패했습니다.')
    }
  }

  const handleTrackingModalClose = () => {
    setShowTrackingModal(false)
    setTrackingOrderId(null)
  }

  const handleChatClick = async (order: Order) => {
    // 관리자는 채팅 기능 비활성화
    alert('관리자 모드에서는 채팅 기능을 사용할 수 없습니다.')
  }

  const handleOrderDetailClick = async (orderId: string | undefined) => {
    if (!orderId) return

    const isExpanding = expandedOrderId !== orderId
    setExpandedOrderId(isExpanding ? orderId : null)

    if (isExpanding) {
      const order = orders.find(o => o.id === orderId)
      if (order?.deliveryMethod === '퀵업체 배송' && order.quickDeliveryOrderNo && !driverInfo[orderId]) {
        await fetchDriverInfo(orderId, order)
      }
    }
  }

  const fetchDriverInfo = async (orderId: string, order: Order) => {
    try {
      const createdAt = new Date(order.createdAt as unknown as string)

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

  // 필터링된 주문
  const filteredOrders = orders.filter(order => {
    // 결제 완료된 주문 또는 환불된 주문만 표시
    if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded') {
      return false
    }

    // 스토어 필터
    if (storeFilter !== 'all' && order.storeId !== storeFilter) {
      return false
    }

    // 주문 상태 필터
    if (filter !== 'all') {
      if (filter === 'cancelled_rejected') {
        if (order.orderStatus !== 'rejected' && order.orderStatus !== 'cancelled' && order.orderStatus !== 'cancelled_before_accept') {
          return false
        }
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
      if (!order.createdAt) {
        return true
      }

      const orderDate = new Date(order.createdAt as unknown as string)
      const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate())
      const startDateOnly = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate())
      const endDateOnly = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate())

      if (orderDateOnly < startDateOnly || orderDateOnly > endDateOnly) {
        return false
      }
    }

    return true
  }).sort((a, b) => {
    // 전체 탭에서만 pending 주문을 맨 위로 정렬
    if (filter === 'all') {
      if (a.orderStatus === 'pending' && b.orderStatus !== 'pending') {
        return -1
      }
      if (a.orderStatus !== 'pending' && b.orderStatus === 'pending') {
        return 1
      }
    }
    return 0
  })


  if (loading) {
    return <Loading />
  }

  return (
    <>
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>전체 주문 관리</h1>

        <div className={styles.filtersWrapper}>
          <OrderFilterTabs filter={filter} orders={orders} onFilterChange={handleFilterChange} />
          <div className={styles.additionalFilters}>
            {/* 스토어 필터 */}
            <select
              className={styles.storeSelect}
              value={storeFilter}
              onChange={(e) => handleStoreFilterChange(e.target.value)}
            >
              <option value="all">전체 판매자</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.storeName}</option>
              ))}
            </select>
            <OrderFilterOptions
              deliveryMethodFilter={deliveryMethodFilter}
              dateRange={dateRange}
              onDeliveryFilterChange={handleDeliveryFilterChange}
              onDateRangeChange={handleDateRangeChange}
            />
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
        {storeFilter !== 'all' && ` (${stores.find(s => s.id === storeFilter)?.storeName})`}
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
        onCancelAdditionalOrder={handleCancelAdditionalOrderClick}
        showStoreName={true}
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

    {/* 인쇄용 주문서 */}
    {expandedOrderId && (
      <PrintOrderSheet
        order={orders.find(o => o.id === expandedOrderId)!}
        driverInfo={driverInfo[expandedOrderId] || null}
      />
    )}
    </>
  )
}
