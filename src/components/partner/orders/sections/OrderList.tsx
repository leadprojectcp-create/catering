'use client'

import type { Order, OrderStatus } from '@/lib/services/orderService'
import OrderCard from './OrderCard'
import styles from './OrderList.module.css'

type FilterStatus = 'all' | 'pending' | 'cancelled_rejected' | 'preparing' | 'shipping' | 'completed'
type DeliveryMethodFilter = 'all' | '퀵업체 배송' | '매장 픽업'

interface OrderListProps {
  orders: Order[]
  filter: FilterStatus
  deliveryMethodFilter: DeliveryMethodFilter
  dateRange: { start: Date | null; end: Date | null }
  expandedOrderId: string | null
  driverInfo: { [orderId: string]: { rName: string; rMobile: string } }
  onToggleExpand: (orderId: string) => void
  onStatusUpdate: (orderId: string, status: OrderStatus) => Promise<void>
  onOpenCancelModal: (orderId: string) => void
  onOpenTrackingModal: (orderId: string) => void
  onOpenChat: (order: Order) => void
  onPrint: (order: Order) => void
}

export default function OrderList({
  orders,
  filter,
  deliveryMethodFilter,
  dateRange,
  expandedOrderId,
  driverInfo,
  onToggleExpand,
  onStatusUpdate,
  onOpenCancelModal,
  onOpenTrackingModal,
  onOpenChat,
  onPrint,
}: OrderListProps) {
  const filterOrders = (orders: Order[]) => {
    return orders.filter(order => {
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

      // 날짜 필터
      if (dateRange.start && dateRange.end) {
        const orderDate = new Date(order.deliveryDate)
        if (orderDate < dateRange.start || orderDate > dateRange.end) {
          return false
        }
      }

      return true
    })
  }

  const filteredOrders = filterOrders(orders)

  if (filteredOrders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📦</div>
        <div className={styles.emptyText}>주문이 없습니다.</div>
      </div>
    )
  }

  return (
    <div className={styles.ordersList}>
      {filteredOrders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          isExpanded={expandedOrderId === order.id}
          driverInfo={order.id ? driverInfo[order.id] : undefined}
          onToggleExpand={() => order.id && onToggleExpand(order.id)}
          onStatusUpdate={onStatusUpdate}
          onOpenCancelModal={onOpenCancelModal}
          onOpenTrackingModal={onOpenTrackingModal}
          onOpenChat={onOpenChat}
          onPrint={() => onPrint(order)}
        />
      ))}
    </div>
  )
}
