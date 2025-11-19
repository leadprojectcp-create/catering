'use client'

import { useMemo, useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import OptimizedImage from '@/components/common/OptimizedImage'
import { OrderData, OrderInfo } from '../types'
import { useDeliveryFeeCalculation } from '../hooks/useDeliveryFeeCalculation'
import { useDeliveryFeeInquiry } from '../hooks/useDeliveryFeeInquiry'
import { useRefundCalculation } from '../hooks/useRefundCalculation'
import { calculateTotalProductPrice, calculateTotalQuantity, calculateTotalPrice } from '../utils/orderCalculations'
import styles from './PaymentSummarySection.module.css'

interface DeliveryPromotionConfig {
  quickDelivery: {
    enabled: boolean
    minOrderAmount: number
    discountAmount: number
    description: string
  }
}

interface PaymentSummarySectionProps {
  user: User | null
  deliveryMethod: string
  deliveryFeeFromAPI: number | null
  usePoint: number
  availablePoint: number
  parcelPaymentMethod: '선결제' | '착불'
  deliveryFeeSettings: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    perQuantity?: number
  } | null
  quickDeliveryFeeSettings: {
    type: '무료' | '조건부 지원' | '유료'
    freeCondition?: number
    maxSupport?: number
  } | null
  orderData: OrderData | null
  orderInfo: OrderInfo
  recipient: string
  addressName: string
  deliveryRequest: string
  detailedRequest: string
  entranceCode: string
  agreements: {
    privacy: boolean
    terms: boolean
    refund: boolean
    marketing: boolean
  }
  orderId: string | null
  searchParams: URLSearchParams
  paymentMethod: 'card' | 'kakaopay' | 'naverpay'
  onUsePointChange: (point: number) => void
  onDeliveryFeeFromAPIChange: (fee: number | null) => void
  onProcessingChange: (isProcessing: boolean) => void
  onPayment?: () => Promise<void>
}

export default function PaymentSummarySection({
  deliveryMethod,
  deliveryFeeFromAPI,
  usePoint,
  availablePoint,
  parcelPaymentMethod,
  deliveryFeeSettings,
  quickDeliveryFeeSettings,
  orderData,
  orderInfo,
  orderId,
  searchParams,
  onUsePointChange,
  onDeliveryFeeFromAPIChange
}: PaymentSummarySectionProps) {
  const [promotionConfig, setPromotionConfig] = useState<DeliveryPromotionConfig | null>(null)

  // 배송비 프로모션 설정 불러오기
  useEffect(() => {
    const loadPromotionConfig = async () => {
      try {
        const response = await fetch('/assets/delivery-promotion.json')
        const config = await response.json()
        setPromotionConfig(config)
      } catch (error) {
        console.error('Failed to load delivery promotion config:', error)
      }
    }
    loadPromotionConfig()
  }, [])

  // 추가 결제 모드 확인
  const isAdditionalOrder = !!searchParams.get('additionalOrderId')

  // 총 상품금액과 수량 계산
  const totalProductPrice = useMemo(() =>
    calculateTotalProductPrice(orderData, isAdditionalOrder)
  , [orderData, isAdditionalOrder])

  const totalQuantity = useMemo(() =>
    calculateTotalQuantity(orderData, isAdditionalOrder)
  , [orderData, isAdditionalOrder])

  // 배송비 계산 hook 사용
  const { deliveryFee, deliveryPromotion, calculateParcelDeliveryFee } = useDeliveryFeeCalculation({
    deliveryMethod,
    deliveryFeeFromAPI,
    deliveryFeeSettings,
    quickDeliveryFeeSettings,
    totalProductPrice,
    totalQuantity,
    isAdditionalOrder,
    orderId
  })

  // 배송비 환급 계산 hook
  const { deliveryFeeRefund, expectedPointReward } = useRefundCalculation({
    isAdditionalOrder,
    orderId,
    orderData,
    totalProductPrice
  })

  // 배송비 조회 hook
  const { isLoadingDeliveryFee, handleDeliveryFeeInquiry } = useDeliveryFeeInquiry({
    deliveryMethod,
    orderInfo,
    orderData,
    onDeliveryFeeChange: onDeliveryFeeFromAPIChange
  })

  // 실제 결제 금액 (배송비 환급 반영) - 음수 가능
  const actualPaymentAmount = useMemo(() => {
    if (deliveryFeeRefund > 0) {
      return totalProductPrice - deliveryFeeRefund - usePoint
    }
    return calculateTotalPrice(totalProductPrice, deliveryFee, deliveryPromotion, usePoint, parcelPaymentMethod)
  }, [totalProductPrice, deliveryFee, deliveryPromotion, usePoint, deliveryFeeRefund, parcelPaymentMethod])

  // 총 결제금액 (화면 표시용)
  const totalPrice = useMemo(() =>
    calculateTotalPrice(totalProductPrice, deliveryFee, deliveryPromotion, usePoint, parcelPaymentMethod)
  , [totalProductPrice, deliveryFee, deliveryPromotion, usePoint, parcelPaymentMethod])

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>총 결제금액</h2>
      <div className={styles.paymentContainer}>
        <div className={styles.paymentRow}>
          <span className={styles.paymentLabel}>총 상품금액</span>
          <span className={styles.paymentValue}>{totalQuantity}개</span>
        </div>
        <div className={styles.paymentRow}>
          <span className={styles.paymentLabel}>총 상품금액</span>
          <span className={styles.paymentValue}>{totalProductPrice.toLocaleString()}원</span>
        </div>

        {/* 퀵업체 배송 - 배송비 조회 버튼 (무료 타입 제외) */}
        {!isAdditionalOrder && deliveryMethod === '퀵업체 배송' && !deliveryFeeFromAPI && quickDeliveryFeeSettings?.type !== '무료' && (
          <div className={styles.paymentRow}>
            <div>
              <div className={styles.paymentLabel}>배송비</div>
              <div className={styles.deliveryFeeNotice}>
                퀵 배송 선택 시, 반드시 배송비조회를 클릭해주세요!
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeliveryFeeInquiry}
              disabled={isLoadingDeliveryFee}
              className={styles.deliveryFeeInquiryButton}
            >
              {isLoadingDeliveryFee ? '조회 중...' : '배송비 조회'}
            </button>
          </div>
        )}

        {/* 퀵업체 배송 - 무료 타입일 때 배송비 표시 */}
        {!isAdditionalOrder && deliveryMethod === '퀵업체 배송' && quickDeliveryFeeSettings?.type === '무료' && (
          <div className={styles.paymentRow}>
            <span className={styles.paymentLabel}>배송비</span>
            <span className={styles.paymentValue}>+0원</span>
          </div>
        )}

        {/* 퀵업체 배송 - 배송비 표시 (조회 후) */}
        {!isAdditionalOrder && deliveryMethod === '퀵업체 배송' && deliveryFeeFromAPI && quickDeliveryFeeSettings?.type !== '무료' && (
          <>
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>배송비</span>
              <span className={styles.paymentValue}>+{deliveryFee.toLocaleString()}원</span>
            </div>

            {/* 조건부 지원일 때: 판매자 부담 표시 */}
            {quickDeliveryFeeSettings?.type === '조건부 지원' &&
             quickDeliveryFeeSettings.freeCondition &&
             quickDeliveryFeeSettings.maxSupport &&
             totalProductPrice >= quickDeliveryFeeSettings.freeCondition && (
              <div className={styles.paymentRow}>
                <div>
                  <div className={styles.paymentLabel}>판매자 부담</div>
                  <div className={styles.deliveryPromotionInfo}>
                    <OptimizedImage
                      src="/icons/quick_delivery.png"
                      alt="퀵배송"
                      width={16}
                      height={16}
                    />
                    <span className={styles.deliveryPromotionLabel}>퀵배송</span>
                    <span className={styles.deliveryPromotionDesc}>
                      {quickDeliveryFeeSettings.freeCondition.toLocaleString()}원 이상 구매 시, {quickDeliveryFeeSettings.maxSupport.toLocaleString()}원 기본 배송비 지원
                    </span>
                  </div>
                </div>
                <span className={styles.promotionValue}>-{quickDeliveryFeeSettings.maxSupport.toLocaleString()}원</span>
              </div>
            )}

            {/* 유료일 때: 프로모션(JSON 설정 기반) 표시 */}
            {deliveryPromotion > 0 && promotionConfig && (
              <div className={styles.paymentRow}>
                <div>
                  <div className={styles.paymentLabel}>판매자 부담</div>
                  <div className={styles.deliveryPromotionInfo}>
                    <OptimizedImage
                      src="/icons/quick_delivery.png"
                      alt="퀵배송"
                      width={16}
                      height={16}
                    />
                    <span className={styles.deliveryPromotionLabel}>퀵배송</span>
                    <span className={styles.deliveryPromotionDesc}>
                      {promotionConfig.quickDelivery.minOrderAmount.toLocaleString()}원 이상 구매 시, {promotionConfig.quickDelivery.discountAmount.toLocaleString()}원 기본 배송비 지원
                    </span>
                  </div>
                </div>
                <span className={styles.promotionValue}>-{deliveryPromotion.toLocaleString()}원</span>
              </div>
            )}
          </>
        )}

        {/* 택배 배송 - 배송비 표시 */}
        {!isAdditionalOrder && deliveryMethod === '택배 배송' && (
          <div className={styles.paymentRow}>
            <div>
              <div className={styles.paymentLabel}>배송비</div>
              {deliveryFeeSettings?.type === '수량별' && deliveryFeeSettings.perQuantity && deliveryFeeSettings.baseFee && (
                <div className={styles.deliveryFeeInfo}>
                  <OptimizedImage
                    src="/icons/parcel_delivery.png"
                    alt="배송비"
                    width={16}
                    height={16}
                  />
                  {deliveryFeeSettings.perQuantity}개당 {deliveryFeeSettings.baseFee.toLocaleString()}원
                </div>
              )}
            </div>
            <span className={styles.paymentValue}>
              {parcelPaymentMethod === '착불'
                ? `착불(${calculateParcelDeliveryFee.toLocaleString()}원)`
                : deliveryFeeSettings?.type === '무료'
                ? '+0원'
                : deliveryFeeSettings?.type === '조건부 무료'
                ? (calculateParcelDeliveryFee === 0 ? '+0원' : `+${calculateParcelDeliveryFee.toLocaleString()}원`)
                : `+${calculateParcelDeliveryFee.toLocaleString()}원`}
            </span>
          </div>
        )}

        {/* 추가 주문 - 배송비 환급/포인트 적립 표시 */}
        {isAdditionalOrder && (
          <>
            {deliveryFeeRefund > 0 ? (
              <div className={styles.paymentRow}>
                <span className={styles.paymentLabel}>🎉 무료 배송 조건 달성! 포인트 적립</span>
                <span className={styles.promotionValue}>+{expectedPointReward.toLocaleString()}P</span>
              </div>
            ) : (
              deliveryMethod === '택배 배송' && deliveryFee !== 0 && (
                <div className={styles.paymentRow}>
                  <span className={styles.paymentLabel}>
                    {deliveryFee < 0 ? '배송비 환불' : '추가 배송비'}
                  </span>
                  <span className={deliveryFee < 0 ? styles.promotionValue : styles.paymentValue}>
                    {deliveryFee < 0 ? '' : '+'}{deliveryFee.toLocaleString()}원
                  </span>
                </div>
              )
            )}
          </>
        )}

        {/* 포인트 사용 */}
        <div className={styles.paymentRowPoint}>
          <span className={styles.paymentLabel}>포인트</span>
          <div className={styles.pointInputContainer}>
            <div className={styles.pointInputWithPrefix}>
              <span className={styles.pointPrefix}>P</span>
              <input
                type="text"
                className={styles.pointInput}
                placeholder="0"
                value={usePoint ? usePoint.toLocaleString() : ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value.replace(/,/g, '')) || 0
                  // 총 상품금액을 초과할 수 없음
                  const maxUsablePoint = Math.min(availablePoint, totalProductPrice)
                  if (value <= maxUsablePoint && value >= 0) {
                    onUsePointChange(value)
                  } else if (e.target.value === '') {
                    onUsePointChange(0)
                  }
                }}
              />
            </div>
            <div className={styles.pointBottomRow}>
              <span className={styles.availablePoint}>사용 가능 : {availablePoint.toLocaleString()}P</span>
              <button
                type="button"
                className={styles.useAllButton}
                onClick={() => {
                  // 총 상품금액을 초과하지 않도록 제한
                  const maxUsablePoint = Math.min(availablePoint, totalProductPrice)
                  onUsePointChange(maxUsablePoint)
                }}
              >
                전액 사용
              </button>
            </div>
          </div>
        </div>

        {/* 총 결제금액 */}
        <div className={styles.paymentTotal}>
          <span>총 결제금액</span>
          <span className={styles.finalPrice}>
            {(isAdditionalOrder && deliveryFeeRefund > 0
              ? actualPaymentAmount
              : totalPrice
            ).toLocaleString()}원
          </span>
        </div>
      </div>
    </section>
  )
}

export type { PaymentSummarySectionProps }
