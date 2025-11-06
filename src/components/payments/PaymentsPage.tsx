'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import DeliveryInfoSection from './sections/DeliveryInfoSection'
import DeliveryMethodSection from './sections/DeliveryMethodSection'
import ParcelPaymentMethodSection from './sections/ParcelPaymentMethodSection'
import PaymentMethodSection from './sections/PaymentMethodSection'
import OrderProductSection from './sections/OrderProductSection'
import PickupRecipientSection from './sections/PickupRecipientSection'
import PickupDateTimeSection from './sections/PickupDateTimeSection'
import DeliveryDateTimeSection from './sections/DeliveryDateTimeSection'
import DeliveryRequestSection from './sections/DeliveryRequestSection'
import PaymentSummarySection from './sections/PaymentSummarySection'
import { usePaymentSummary } from './hooks/usePaymentSummary'
import { useOrderData } from './hooks/useOrderData'
import { usePaymentForm } from './hooks/usePaymentForm'
import AgreementsSection from './sections/AgreementsSection'
import PrivacyPolicy from '@/components/terms/PrivacyPolicy'
import RefundPolicy from '@/components/terms/RefundPolicy'
import PaymentTerms from './sections/PaymentTerms'
import styles from './PaymentsPage.module.css'

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const [isPostcodeLoaded, setIsPostcodeLoaded] = useState(false)
  const [showDateInfoModal, setShowDateInfoModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState<string | null>(null)
  const [deliveryFeeFromAPI, setDeliveryFeeFromAPI] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentType, setPaymentType] = useState<'general' | 'easy'>('general')

  // PortOne 결제창에서 결제 수단을 선택하므로 고정값 사용
  const paymentMethod = 'card'

  // 주문 데이터 로딩 hook
  const {
    loading,
    orderId,
    orderData,
    deliveryMethod,
    minOrderDays,
    quantityRanges,
    totalQuantity,
    deliveryFeeSettings,
    parcelPaymentMethod,
    savedAddresses,
    availablePoint,
    setDeliveryMethod,
    setParcelPaymentMethod,
    setSavedAddresses
  } = useOrderData(user)

  // 폼 상태 관리 hook
  const {
    orderInfo,
    recipient,
    addressName,
    deliveryRequest,
    detailedRequest,
    entranceCode,
    agreements,
    agreeAll,
    usePoint,
    setOrderInfo,
    setRecipient,
    setAddressName,
    setDeliveryRequest,
    setDetailedRequest,
    setEntranceCode,
    setAgreements,
    setAgreeAll,
    setUsePoint
  } = usePaymentForm(user, orderId)

  // 배송 정보가 변경되면 배송비 조회를 다시 해야 하므로 deliveryFeeFromAPI 초기화
  useEffect(() => {
    if (deliveryMethod === '퀵업체 배송' && deliveryFeeFromAPI !== null) {
      setDeliveryFeeFromAPI(null)
    }
  }, [orderInfo.deliveryDate, orderInfo.deliveryTime, orderInfo.address])

  // usePaymentSummary hook 사용
  const {
    handlePayment,
    totalPrice: calculatedTotalPrice,
    actualPaymentAmount,
    deliveryFeeRefund,
    expectedPointReward
  } = usePaymentSummary({
    user,
    deliveryMethod,
    deliveryFeeFromAPI,
    usePoint,
    availablePoint,
    parcelPaymentMethod,
    deliveryFeeSettings,
    orderData,
    orderInfo,
    recipient,
    addressName,
    deliveryRequest,
    detailedRequest,
    entranceCode,
    agreements,
    orderId,
    searchParams,
    paymentMethod,
    paymentType,
    onUsePointChange: setUsePoint,
    onDeliveryFeeFromAPIChange: setDeliveryFeeFromAPI,
    onProcessingChange: setIsProcessing
  })

  // 다음 Postcode API 로드 핸들러
  const handlePostcodeLoad = () => {
    setIsPostcodeLoaded(true)
  }

  if (loading || isProcessing) {
    return <Loading />
  }

  // additionalOrderId가 있는지 확인
  const isAdditionalOrder = !!searchParams.get('additionalOrderId')

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        onLoad={handlePostcodeLoad}
      />
      <div className={styles.container}>
        {/* 주문상품 */}
        <OrderProductSection
          orderData={orderData}
          orderId={orderId}
          isCartMode={!!searchParams.get('cartId')}
          additionalOrderId={searchParams.get('additionalOrderId')}
        />

        {/* 추가 주문이 아닐 때만 배송방법, 수령인 정보 등 표시 */}
        {!isAdditionalOrder && (
          <>
            {/* 배송방법 선택 */}
            <DeliveryMethodSection
              deliveryMethods={orderData?.deliveryMethods}
              selectedMethod={deliveryMethod}
              onMethodChange={setDeliveryMethod}
            />

            {/* 택배 배송 - 배송비 결제 방식 */}
            {deliveryMethod === '택배 배송' && deliveryFeeSettings && (
              <ParcelPaymentMethodSection
                deliveryFeeSettings={deliveryFeeSettings}
                parcelPaymentMethod={parcelPaymentMethod}
                totalPrice={orderData?.items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0) || 0}
                onMethodChange={setParcelPaymentMethod}
              />
            )}

            {/* 매장 픽업 - 수령인 정보 */}
            {deliveryMethod === '매장 픽업' && (
              <>
                <PickupRecipientSection
                  recipient={recipient}
                  phone={orderInfo.phone}
                  onRecipientChange={setRecipient}
                  onPhoneChange={(phone) => setOrderInfo({...orderInfo, phone})}
                />
                <PickupDateTimeSection
                  deliveryDate={orderInfo.deliveryDate}
                  deliveryTime={orderInfo.deliveryTime}
                  minOrderDays={minOrderDays}
                  quantityRanges={quantityRanges}
                  totalQuantity={totalQuantity}
                  onDateChange={(date) => setOrderInfo({...orderInfo, deliveryDate: date})}
                  onTimeChange={(time) => setOrderInfo({...orderInfo, deliveryTime: time})}
                  onShowDateInfoModal={() => setShowDateInfoModal(true)}
                />
              </>
            )}

            {/* 퀵업체 배송 또는 택배 배송 선택시 배송지 설정 표시 */}
            {(deliveryMethod === '퀵업체 배송' || deliveryMethod === '택배 배송') && (
              <>
                {/* 배송지 설정 */}
                <DeliveryInfoSection
                  userId={user?.uid || null}
                  orderInfo={orderInfo}
                  recipient={recipient}
                  addressName={addressName}
                  savedAddresses={savedAddresses}
                  onOrderInfoChange={setOrderInfo}
                  onRecipientChange={setRecipient}
                  onAddressNameChange={setAddressName}
                  onSavedAddressesChange={setSavedAddresses}
                />

                <DeliveryDateTimeSection
                  deliveryDate={orderInfo.deliveryDate}
                  deliveryTime={orderInfo.deliveryTime}
                  minOrderDays={minOrderDays}
                  deliveryMethod={deliveryMethod}
                  quantityRanges={quantityRanges}
                  totalQuantity={totalQuantity}
                  onDateChange={(date) => setOrderInfo({...orderInfo, deliveryDate: date})}
                  onTimeChange={(time) => setOrderInfo({...orderInfo, deliveryTime: time})}
                  onShowDateInfoModal={() => setShowDateInfoModal(true)}
                />
                <DeliveryRequestSection
                  deliveryRequest={deliveryRequest}
                  entranceCode={entranceCode}
                  detailedRequest={detailedRequest}
                  onDeliveryRequestChange={setDeliveryRequest}
                  onEntranceCodeChange={setEntranceCode}
                  onDetailedRequestChange={setDetailedRequest}
                />
              </>
            )}
          </>
        )}

        {/* 결제 수단 선택 */}
        <PaymentMethodSection
          paymentType={paymentType}
          onPaymentTypeChange={setPaymentType}
        />

        {/* 총 결제금액 */}
        <PaymentSummarySection
          user={user}
          deliveryMethod={deliveryMethod}
          deliveryFeeFromAPI={deliveryFeeFromAPI}
          usePoint={usePoint}
          availablePoint={availablePoint}
          parcelPaymentMethod={parcelPaymentMethod}
          deliveryFeeSettings={deliveryFeeSettings}
          orderData={orderData}
          orderInfo={orderInfo}
          recipient={recipient}
          addressName={addressName}
          deliveryRequest={deliveryRequest}
          detailedRequest={detailedRequest}
          entranceCode={entranceCode}
          agreements={agreements}
          orderId={orderId}
          searchParams={searchParams}
          paymentMethod={paymentMethod}
          onUsePointChange={setUsePoint}
          onDeliveryFeeFromAPIChange={setDeliveryFeeFromAPI}
          onProcessingChange={setIsProcessing}
        />

        {/* 약관 동의 */}
        <AgreementsSection
          agreeAll={agreeAll}
          agreements={agreements}
          onAgreeAllChange={(checked) => {
            setAgreeAll(checked)
            setAgreements({
              privacy: checked,
              terms: checked,
              refund: checked,
              marketing: checked
            })
          }}
          onAgreementChange={(key, checked) => {
            setAgreements({...agreements, [key]: checked})
            setAgreeAll(false)
          }}
          onShowTermsModal={setShowTermsModal}
        />

        {/* 결제하기 버튼 */}
        <button
          type="button"
          onClick={handlePayment}
          className={styles.paymentButton}
        >
          {actualPaymentAmount < 0
            ? `${Math.abs(actualPaymentAmount).toLocaleString()}P 적립하기`
            : actualPaymentAmount === 0
              ? '주문 완료하기'
              : `${actualPaymentAmount.toLocaleString()}원 결제하기`
          }
        </button>
      </div>

      {/* 배송 날짜 정보 모달 */}
      {showDateInfoModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDateInfoModal(false)}>
          <div className={styles.infoModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoModalHeader}>
              <h3>배송 날짜 안내</h3>
              <button
                className={styles.closeButton}
                onClick={() => setShowDateInfoModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.infoModalContent}>
              <p>배송 날짜는 <strong>현재일 기준으로 최대 1개월(30일) 이내</strong>만 주문할 수 있습니다.</p>
              <ul>
                <li>오늘 날짜부터 선택 가능합니다.</li>
                <li>30일 이후의 날짜는 선택할 수 없습니다.</li>
                <li>정확한 배송 일정을 위해 미리 계획하여 주문해 주세요.</li>
              </ul>
            </div>
            <div className={styles.infoModalFooter}>
              <button
                className={styles.confirmButton}
                onClick={() => setShowDateInfoModal(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 약관 모달 */}
      {showTermsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTermsModal(null)}>
          <div className={styles.termsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.termsModalHeader}>
              <button
                className={styles.closeButton}
                onClick={() => setShowTermsModal(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.termsModalContent}>
              {showTermsModal === 'privacy' && <PrivacyPolicy />}
              {showTermsModal === 'payment' && <PaymentTerms />}
              {showTermsModal === 'refund' && <RefundPolicy />}
            </div>
            <div className={styles.termsModalFooter}>
              <button
                className={styles.confirmButton}
                onClick={() => setShowTermsModal(null)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
