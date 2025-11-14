'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore'
import { getCommissionConfig, calculateFeeRate, CommissionConfig } from '@/lib/commission'
import styles from './AdminSettlementPage.module.css'

interface PartnerSettlement {
  partnerId: string
  partnerName: string
  partnerEmail: string
  orders: OrderItem[]
  totalSales: number
  totalFee: number
  totalSettlement: number
  pendingCount: number
  completedCount: number
}

interface OrderItem {
  id: string
  orderNumber: string
  productName: string
  totalProductPrice: number
  orderDate: unknown
  settlementStatus: 'pending' | 'completed'
  settlementDate?: unknown
  fee: number
  settlementAmount: number
  feeRate: number
  orderIndex: number // 해당 파트너의 몇 번째 주문인지
}

export default function AdminSettlementPage() {
  const [partners, setPartners] = useState<PartnerSettlement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPartner, setSelectedPartner] = useState<PartnerSettlement | null>(null)
  const [processing, setProcessing] = useState(false)
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig | null>(null)

  useEffect(() => {
    const init = async () => {
      const config = await getCommissionConfig()
      setCommissionConfig(config)
      await fetchSettlements(config)
    }
    init()
  }, [])

  const fetchSettlements = async (config?: CommissionConfig) => {
    try {
      setLoading(true)
      console.log('[AdminSettlement] 정산 데이터 조회 시작')

      // config가 없으면 가져오기
      const commConfig = config || await getCommissionConfig()

      // 1. 모든 완료된 주문 가져오기
      const ordersRef = collection(db, 'orders')
      const q = query(
        ordersRef,
        where('orderStatus', '==', 'completed'),
        where('paymentStatus', '==', 'paid')
      )
      const ordersSnapshot = await getDocs(q)
      console.log('[AdminSettlement] 조회된 주문 수:', ordersSnapshot.size)

      // 2. 파트너별로 그룹화
      const partnerMap = new Map<string, OrderItem[]>()
      const partnerInfoMap = new Map<string, { name: string; email: string }>()

      ordersSnapshot.forEach((doc) => {
        const data = doc.data()
        const partnerId = data.partnerId

        if (!partnerId) return

        const productName = data.items?.[0]?.productName || data.productName || '상품명 없음'

        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, [])
          partnerInfoMap.set(partnerId, {
            name: data.storeName || data.partnerName || '파트너명 없음',
            email: data.partnerEmail || ''
          })
        }

        const orders = partnerMap.get(partnerId)!
        orders.push({
          id: doc.id,
          orderNumber: data.orderNumber || doc.id,
          productName,
          totalProductPrice: data.totalProductPrice || 0,
          orderDate: data.createdAt,
          settlementStatus: data.settlementStatus || 'pending',
          settlementDate: data.settlementDate,
          fee: 0, // 나중에 계산
          settlementAmount: 0, // 나중에 계산
          feeRate: 0, // 나중에 계산
          orderIndex: 0 // 나중에 설정
        })
      })

      // 3. 각 파트너별 정산 계산
      const partnerSettlements: PartnerSettlement[] = []

      partnerMap.forEach((orders, partnerId) => {
        // 날짜순 정렬
        orders.sort((a, b) => {
          const aTime = a.orderDate instanceof Timestamp ? a.orderDate.toMillis() : 0
          const bTime = b.orderDate instanceof Timestamp ? b.orderDate.toMillis() : 0
          return aTime - bTime
        })

        // orderIndex 설정 및 정산 계산
        let totalSales = 0
        let totalFee = 0
        let totalSettlement = 0
        let pendingCount = 0
        let completedCount = 0

        orders.forEach((order, index) => {
          order.orderIndex = index + 1
          const feeRate = calculateFeeRate(order.orderIndex, commConfig)
          const fee = order.totalProductPrice * feeRate
          const settlementAmount = order.totalProductPrice - fee

          order.fee = fee
          order.settlementAmount = settlementAmount
          order.feeRate = Math.round(feeRate * 100) // 퍼센트로 표시

          totalSales += order.totalProductPrice
          totalFee += fee
          totalSettlement += settlementAmount

          if (order.settlementStatus === 'completed') {
            completedCount++
          } else {
            pendingCount++
          }
        })

        const partnerInfo = partnerInfoMap.get(partnerId)!
        partnerSettlements.push({
          partnerId,
          partnerName: partnerInfo.name,
          partnerEmail: partnerInfo.email,
          orders,
          totalSales,
          totalFee,
          totalSettlement,
          pendingCount,
          completedCount
        })
      })

      // 정산 대기 건수가 많은 순으로 정렬
      partnerSettlements.sort((a, b) => b.pendingCount - a.pendingCount)

      console.log('[AdminSettlement] 파트너 수:', partnerSettlements.length)
      setPartners(partnerSettlements)
    } catch (error) {
      console.error('[AdminSettlement] 정산 데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettlement = async (partner: PartnerSettlement, orderIds: string[]) => {
    if (!confirm(`${partner.partnerName}의 ${orderIds.length}건 주문을 정산 완료 처리하시겠습니까?`)) {
      return
    }

    try {
      setProcessing(true)
      console.log('[AdminSettlement] 정산 처리 시작:', orderIds)

      const batch = writeBatch(db)
      const now = new Date().toISOString()

      orderIds.forEach((orderId) => {
        const orderRef = doc(db, 'orders', orderId)
        batch.update(orderRef, {
          settlementStatus: 'completed',
          settlementDate: now
        })
      })

      await batch.commit()
      console.log('[AdminSettlement] 정산 처리 완료')

      alert('정산이 완료되었습니다.')
      await fetchSettlements() // 데이터 다시 불러오기
      setSelectedPartner(null)
    } catch (error) {
      console.error('[AdminSettlement] 정산 처리 실패:', error)
      alert('정산 처리에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleSettleAll = async (partner: PartnerSettlement) => {
    const pendingOrders = partner.orders.filter(o => o.settlementStatus === 'pending')
    if (pendingOrders.length === 0) {
      alert('정산 대기 중인 주문이 없습니다.')
      return
    }

    await handleSettlement(partner, pendingOrders.map(o => o.id))
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.floor(num))
  }

  const formatDate = (date: unknown) => {
    if (!date) return '-'
    if (date instanceof Timestamp) {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date.toDate())
    }
    return '-'
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
      <h1 className={styles.title}>정산 관리</h1>

      {selectedPartner ? (
        // 상세 보기
        <div className={styles.detailView}>
          <button onClick={() => setSelectedPartner(null)} className={styles.backButton}>
            ← 목록으로
          </button>

          <div className={styles.partnerInfo}>
            <h2 className={styles.partnerName}>{selectedPartner.partnerName}</h2>
            <p className={styles.partnerEmail}>{selectedPartner.partnerEmail}</p>
          </div>

          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>총 판매 금액</div>
              <div className={styles.summaryValue}>{formatNumber(selectedPartner.totalSales)}원</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>총 수수료</div>
              <div className={styles.summaryValue}>-{formatNumber(selectedPartner.totalFee)}원</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>정산 금액</div>
              <div className={styles.summaryValue}>{formatNumber(selectedPartner.totalSettlement)}원</div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              onClick={() => handleSettleAll(selectedPartner)}
              className={styles.settleAllButton}
              disabled={processing || selectedPartner.pendingCount === 0}
            >
              {processing ? '처리 중...' : `미정산 건 일괄 정산 (${selectedPartner.pendingCount}건)`}
            </button>
          </div>

          <div className={styles.ordersList}>
            {selectedPartner.orders.map((order) => (
              <div key={order.id} className={styles.orderItem}>
                <div className={styles.orderHeader}>
                  <div className={styles.orderInfo}>
                    <span className={styles.orderLabel}>주문 #{order.orderIndex}</span>
                    {order.orderIndex <= 5 && (
                      <span className={styles.promoBadge}>프로모션</span>
                    )}
                    {order.settlementStatus === 'completed' ? (
                      <span className={styles.completedBadge}>정산완료</span>
                    ) : (
                      <span className={styles.pendingBadge}>정산대기</span>
                    )}
                  </div>
                  <div className={styles.orderDate}>{formatDate(order.orderDate)}</div>
                </div>
                <div className={styles.orderContent}>
                  <div className={styles.productName}>{order.productName}</div>
                  <div className={styles.priceInfo}>
                    <div className={styles.priceRow}>
                      <span>상품 금액</span>
                      <span>{formatNumber(order.totalProductPrice)}원</span>
                    </div>
                    <div className={styles.priceRow}>
                      <span>수수료 ({order.feeRate}%)</span>
                      <span className={styles.fee}>-{formatNumber(order.fee)}원</span>
                    </div>
                    <div className={styles.priceRow + ' ' + styles.total}>
                      <span>정산 금액</span>
                      <span className={styles.settlement}>{formatNumber(order.settlementAmount)}원</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // 목록 보기
        <div className={styles.listView}>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>전체 파트너</div>
              <div className={styles.statValue}>{partners.length}명</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>정산 대기</div>
              <div className={styles.statValue}>
                {partners.reduce((sum, p) => sum + p.pendingCount, 0)}건
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>정산 완료</div>
              <div className={styles.statValue}>
                {partners.reduce((sum, p) => sum + p.completedCount, 0)}건
              </div>
            </div>
          </div>

          <div className={styles.partnersList}>
            {partners.map((partner) => (
              <div
                key={partner.partnerId}
                className={styles.partnerCard}
                onClick={() => setSelectedPartner(partner)}
              >
                <div className={styles.partnerHeader}>
                  <div>
                    <h3 className={styles.partnerCardName}>{partner.partnerName}</h3>
                    <p className={styles.partnerCardEmail}>{partner.partnerEmail}</p>
                  </div>
                  <div className={styles.badges}>
                    {partner.pendingCount > 0 && (
                      <span className={styles.pendingCountBadge}>
                        대기 {partner.pendingCount}건
                      </span>
                    )}
                    {partner.completedCount > 0 && (
                      <span className={styles.completedCountBadge}>
                        완료 {partner.completedCount}건
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.partnerStats}>
                  <div className={styles.partnerStat}>
                    <span>총 판매</span>
                    <span>{formatNumber(partner.totalSales)}원</span>
                  </div>
                  <div className={styles.partnerStat}>
                    <span>정산 금액</span>
                    <span className={styles.highlight}>{formatNumber(partner.totalSettlement)}원</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
