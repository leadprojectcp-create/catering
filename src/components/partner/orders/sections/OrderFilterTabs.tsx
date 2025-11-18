'use client'

import type { Order } from '@/lib/services/orderService'
import styles from './OrderFilterTabs.module.css'

type FilterStatus = 'all' | 'pending' | 'cancelled_rejected' | 'preparing' | 'shipping' | 'completed'

interface OrderFilterTabsProps {
  filter: FilterStatus
  orders: Order[]
  onFilterChange: (filter: FilterStatus) => void
}

export default function OrderFilterTabs({ filter, orders, onFilterChange }: OrderFilterTabsProps) {
  return (
    <div className={styles.filters}>
      <button
        className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
        onClick={() => onFilterChange('all')}
      >
        전체 <span className={styles.filterCount}>{orders.filter(o => (o.paymentStatus === 'paid' || o.paymentStatus === 'refunded') && o.orderStatus !== 'cancelled_before_accept').length}건</span>
      </button>
      <button
        className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
        onClick={() => onFilterChange('pending')}
      >
        신규 주문 <span className={styles.filterCount}>{orders.filter(o => o.paymentStatus === 'paid' && o.orderStatus === 'pending').length}건</span>
      </button>
      <button
        className={`${styles.filterBtn} ${filter === 'cancelled_rejected' ? styles.active : ''}`}
        onClick={() => onFilterChange('cancelled_rejected')}
      >
        주문 취소 <span className={styles.filterCount}>{orders.filter(o => (o.paymentStatus === 'paid' || o.paymentStatus === 'refunded') && (o.orderStatus === 'rejected' || o.orderStatus === 'cancelled')).length}건</span>
      </button>
      <button
        className={`${styles.filterBtn} ${filter === 'preparing' ? styles.active : ''}`}
        onClick={() => onFilterChange('preparing')}
      >
        준비중 <span className={styles.filterCount}>{orders.filter(o => o.paymentStatus === 'paid' && o.orderStatus === 'preparing').length}건</span>
      </button>
      <button
        className={`${styles.filterBtn} ${filter === 'shipping' ? styles.active : ''}`}
        onClick={() => onFilterChange('shipping')}
      >
        배송·픽업중 <span className={styles.filterCount}>{orders.filter(o => o.paymentStatus === 'paid' && o.orderStatus === 'shipping').length}건</span>
      </button>
      <button
        className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
        onClick={() => onFilterChange('completed')}
      >
        완료 <span className={styles.filterCount}>{orders.filter(o => o.paymentStatus === 'paid' && o.orderStatus === 'completed').length}건</span>
      </button>
    </div>
  )
}
