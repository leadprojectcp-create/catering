'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
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

export default function SettlementPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [totalSettlement, setTotalSettlement] = useState(0)
  const [totalFee, setTotalFee] = useState(0)

  useEffect(() => {
    console.log('[SettlementPage] useEffect 실행, user:', user)
    if (user) {
      fetchOrders()
    } else {
      console.log('[SettlementPage] user가 없습니다')
      setLoading(false)
    }
  }, [user])

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

      <div className={styles.ordersSection}>
        <h2 className={styles.sectionTitle}>주문 내역 ({orders.length}건)</h2>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>정산 가능한 주문이 없습니다.</p>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map((order) => {
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
