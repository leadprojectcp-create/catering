'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import DeliveryInfoSection from './sections/DeliveryInfoSection'
import DeliveryMethodSection from './sections/DeliveryMethodSection'
import ParcelPaymentMethodSection from './sections/ParcelPaymentMethodSection'
import OrderProductSection from './sections/OrderProductSection'
import PickupRecipientSection from './sections/PickupRecipientSection'
import PickupDateTimeSection from './sections/PickupDateTimeSection'
import DeliveryDateTimeSection from './sections/DeliveryDateTimeSection'
import DeliveryRequestSection from './sections/DeliveryRequestSection'
import PaymentSummarySection, { usePaymentSummary } from './sections/PaymentSummarySection'
import AgreementsSection from './sections/AgreementsSection'
import { OrderData, DeliveryAddress } from './types'
import PrivacyPolicy from '@/components/terms/PrivacyPolicy'
import RefundPolicy from '@/components/terms/RefundPolicy'
import PaymentTerms from './sections/PaymentTerms'
import styles from './PaymentsPage.module.css'

export default function PaymentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState('pickup')
  const [orderInfo, setOrderInfo] = useState({
    orderer: '',
    phone: '',
    email: '',
    detailAddress: '',
    address: '',
    zipCode: '',
    deliveryDate: '',
    deliveryTime: '',
    request: ''
  })
  const [agreements, setAgreements] = useState({
    privacy: false,
    terms: false,
    refund: false,
    marketing: false
  })
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([])
  const [addressName, setAddressName] = useState('')
  const [isPostcodeLoaded, setIsPostcodeLoaded] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [deliveryRequest, setDeliveryRequest] = useState('')
  const [detailedRequest, setDetailedRequest] = useState('')
  const [entranceCode, setEntranceCode] = useState('')
  const [agreeAll, setAgreeAll] = useState(false)
  const [showDateInfoModal, setShowDateInfoModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState<string | null>(null)
  const [usePoint, setUsePoint] = useState(0)
  const [availablePoint, setAvailablePoint] = useState(0)
  const [minOrderDays, setMinOrderDays] = useState(0)
  const [deliveryFeeFromAPI, setDeliveryFeeFromAPI] = useState<number | null>(null)
  const [deliveryFeeSettings, setDeliveryFeeSettings] = useState<{
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    paymentMethods?: ('선결제' | '착불')[]
    perQuantity?: number
  } | null>(null)
  const [parcelPaymentMethod, setParcelPaymentMethod] = useState<'선결제' | '착불'>('선결제')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      // URL에서 cartId 또는 orderId 가져오기
      const cartIdParam = searchParams.get('cartId')
      const orderIdParam = searchParams.get('orderId')

      const id = cartIdParam || orderIdParam
      const collection = cartIdParam ? 'shoppingCart' : 'orders'

      if (!id) {
        alert('주문 정보가 없습니다.')
        router.push('/')
        return
      }

      setOrderId(id)

      try {
        // Firestore에서 주문 정보 가져오기 (shoppingCart 또는 orders)
        const orderDoc = await getDoc(doc(db, collection, id))

        if (!orderDoc.exists()) {
          alert('주문 정보를 찾을 수 없습니다.')
          router.push('/')
          return
        }

        const orderDocData = orderDoc.data()

        // 상품 정보 가져오기 (첫 번째 상품 기준)
        const firstItem = orderDocData.items[0]
        const productDoc = await getDoc(doc(db, 'products', firstItem.productId))

        let deliveryMethods: string[] = []
        let productImage = ''
        if (productDoc.exists()) {
          const productData = productDoc.data()
          deliveryMethods = productData.deliveryMethods || []

          // products 컬렉션에서 이미지 가져오기
          if (productData.images && productData.images.length > 0) {
            productImage = productData.images[0]
          }

          // minOrderDays 가져오기
          if (productData.minOrderDays !== undefined) {
            setMinOrderDays(productData.minOrderDays)
          }

          // deliveryFeeSettings 가져오기
          if (productData.deliveryFeeSettings) {
            setDeliveryFeeSettings(productData.deliveryFeeSettings)
          }

          // orderDocData에서 저장된 택배 결제방법 확인 (우선순위 1)
          if (orderDocData.parcelPaymentMethod) {
            setParcelPaymentMethod(orderDocData.parcelPaymentMethod)
          } else if (productData.deliveryFeeSettings?.paymentMethods && productData.deliveryFeeSettings.paymentMethods.length > 0) {
            // 저장된 값이 없으면 첫 번째 값을 기본값으로 설정 (우선순위 2)
            setParcelPaymentMethod(productData.deliveryFeeSettings.paymentMethods[0])
          }

          // orderDocData에서 저장된 배송방법 확인
          if (orderDocData.deliveryMethod) {
            setDeliveryMethod(orderDocData.deliveryMethod)
          } else if (deliveryMethods.length > 0) {
            setDeliveryMethod(deliveryMethods[0])
          }
        }

        // OrderData 형식으로 변환
        const data: OrderData = {
          storeId: orderDocData.storeId,
          storeName: orderDocData.storeName,
          productId: firstItem.productId,
          productName: firstItem.productName,
          productPrice: firstItem.price,
          productImage: productImage,
          items: orderDocData.items,
          totalPrice: orderDocData.totalProductPrice,
          storeRequest: orderDocData.request || '',
          deliveryMethods: deliveryMethods,
          minOrderDays: minOrderDays,
          deliveryFeeSettings: deliveryFeeSettings || undefined
        }

        setOrderData(data)

        // orders 컬렉션에서 가져온 경우 기존 주문 정보 복원
        if (orderIdParam && orderDocData) {
          // 배송 정보 복원
          if (orderDocData.deliveryInfo) {
            const deliveryInfo = orderDocData.deliveryInfo
            setAddressName(deliveryInfo.addressName || '')

            setOrderInfo(prev => ({
              ...prev,
              deliveryDate: deliveryInfo.deliveryDate || '',
              deliveryTime: deliveryInfo.deliveryTime || '',
              address: deliveryInfo.address || '',
              detailAddress: deliveryInfo.detailAddress || ''
            }))
            setEntranceCode(deliveryInfo.entrancePassword || '')
            setRecipient(deliveryInfo.recipient || '')
            setDeliveryRequest(deliveryInfo.deliveryRequest || '')
            setDetailedRequest(deliveryInfo.detailedRequest || '')
          } else {
            // 이전 형식의 데이터 복원
            let detailAddr = orderDocData.detailAddress || ''
            let entranceCodeValue = ''
            const match = detailAddr.match(/^(.+?)\s*\((.+)\)$/)
            if (match) {
              detailAddr = match[1].trim()
              entranceCodeValue = match[2].trim()
            }

            setOrderInfo(prev => ({
              ...prev,
              deliveryDate: orderDocData.deliveryDate || '',
              deliveryTime: orderDocData.deliveryTime || '',
              address: orderDocData.address || '',
              detailAddress: detailAddr
            }))
            setEntranceCode(entranceCodeValue)
            setRecipient(orderDocData.recipient || '')
            setDeliveryRequest(orderDocData.request || '')
            setDetailedRequest(orderDocData.detailedRequest || '')
          }

          // 주문자 정보 복원
          setOrderInfo(prev => ({
            ...prev,
            orderer: orderDocData.orderer || prev.orderer,
            phone: orderDocData.phone || prev.phone
          }))

          // 배송 방법 복원
          if (orderDocData.deliveryMethod) {
            setDeliveryMethod(orderDocData.deliveryMethod)
          }
        }

        // Firestore에서 저장된 배송지 목록 및 사용자 정보 불러오기
        if (user) {
          const userDocRef = doc(db, 'users', user.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const userData = userDoc.data()

            // 저장된 배송지 불러오기
            if (userData.deliveryAddresses) {
              setSavedAddresses(userData.deliveryAddresses)
            }

            // Firestore에서 사용자 정보 설정
            if (userData.email) {
              setOrderInfo(prev => ({
                ...prev,
                email: userData.email
              }))
            }

            // 사용자 이름 설정 (수령인 및 주문자)
            if (userData.name) {
              setRecipient(userData.name)
              setOrderInfo(prev => ({
                ...prev,
                orderer: userData.name
              }))
            }

            // 사용자 전화번호 설정 (연락처)
            if (userData.phone) {
              setOrderInfo(prev => ({
                ...prev,
                phone: userData.phone
              }))
            }

            // 포인트 설정
            if (userData.point !== undefined) {
              setAvailablePoint(userData.point)
            }
          }
        }
      } catch (error) {
        console.error('데이터 로딩 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, searchParams, router])

  // usePaymentSummary hook 사용
  const { handlePayment, totalPrice: calculatedTotalPrice } = usePaymentSummary({
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
    onUsePointChange: setUsePoint,
    onDeliveryFeeFromAPIChange: setDeliveryFeeFromAPI,
    onProcessingChange: setIsProcessing
  })

  // 주소 검색 핸들러
  // 다음 Postcode API 로드 핸들러
  const handlePostcodeLoad = () => {
    setIsPostcodeLoaded(true);
  }

  if (loading || isProcessing) {
    return <Loading />
  }

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
        />

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
          {calculatedTotalPrice.toLocaleString()}원 결제하기
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
