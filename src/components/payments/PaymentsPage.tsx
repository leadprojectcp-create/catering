'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Script from 'next/script'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Loading from '@/components/Loading'
import DeliveryInfo from './DeliveryInfo'
import DateTimePicker from './DateTimePicker'
import { OrderData, DeliveryAddress, DaumPostcodeData, OrderInfo } from './types'
import { createOrder } from '@/lib/services/paymentsService'
import { requestPayment } from '@/lib/services/paymentService'
import styles from './PaymentsPage.module.css'

export default function PaymentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
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
  const [detailedRequest, setDetailedRequest] = useState('')
  const [entranceCode, setEntranceCode] = useState('')
  const [showRequestDropdown, setShowRequestDropdown] = useState(false)
  const [agreeAll, setAgreeAll] = useState(false)
  const [usePoint, setUsePoint] = useState(0)
  const [availablePoint, setAvailablePoint] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      // 세션 스토리지에서 주문 데이터 가져오기
      const savedOrderData = sessionStorage.getItem('orderData')

      if (!savedOrderData) {
        console.log('주문 정보가 없습니다.')
        setLoading(false)
        return
      }

      try {
        const data = JSON.parse(savedOrderData) as OrderData

        // 상품의 deliveryMethods 가져오기
        if (data.productId) {
          const productDoc = await getDoc(doc(db, 'products', data.productId))
          if (productDoc.exists()) {
            const productData = productDoc.data()
            console.log('Product data:', productData)
            console.log('Product deliveryMethods:', productData.deliveryMethods)
            if (productData.deliveryMethods && productData.deliveryMethods.length > 0) {
              // orderData에 deliveryMethods 추가
              data.deliveryMethods = productData.deliveryMethods
              console.log('Updated orderData with deliveryMethods:', data.deliveryMethods)
              // 첫 번째 배송방법을 기본값으로 설정
              setDeliveryMethod(productData.deliveryMethods[0])
            }
          }
        }

        console.log('Final orderData:', data)
        setOrderData(data)

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

            // Firestore에서 이메일 설정
            if (userData.email) {
              setOrderInfo(prev => ({
                ...prev,
                email: userData.email
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
  }, [user])

  // 주소 검색 핸들러
  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data: DaumPostcodeData) {
          const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
          setOrderInfo({
            ...orderInfo,
            address: addr,
            zipCode: data.zonecode
          });
        }
      }).open();
    } else {
      alert('주소 검색 서비스를 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }

  // 다음 Postcode API 로드 핸들러
  const handlePostcodeLoad = () => {
    setIsPostcodeLoaded(true);
  }

  // 결제하기 버튼 클릭
  const handlePayment = async () => {
    // 유효성 검사
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/auth/login')
      return
    }

    if (!orderData) {
      alert('주문 정보가 없습니다.')
      return
    }

    if (!orderInfo.orderer.trim()) {
      alert('주문자 이름을 입력해주세요.')
      return
    }

    if (!orderInfo.phone.trim()) {
      alert('연락처를 입력해주세요.')
      return
    }

    // 이메일이 없으면 user 객체에서 가져오기 시도
    let userEmail = orderInfo.email
    if (!userEmail || !userEmail.trim()) {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          userEmail = userDoc.data().email || ''
        }
      }
    }

    // 이메일 검증
    if (!userEmail || !userEmail.trim()) {
      alert('이메일 정보를 찾을 수 없습니다. 프로필에서 이메일을 등록해주세요.')
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail)) {
      alert(`등록된 이메일 형식이 올바르지 않습니다: ${userEmail}\n프로필에서 올바른 이메일로 변경해주세요.`)
      return
    }

    console.log('=== 이메일 검증 완료 ===')
    console.log('사용할 이메일:', userEmail)

    if (!orderInfo.address.trim()) {
      alert('주소를 입력해주세요.')
      return
    }

    if (!recipient.trim()) {
      alert('수령인 이름을 입력해주세요.')
      return
    }

    if (!orderInfo.deliveryDate) {
      alert('배송 날짜를 선택해주세요.')
      return
    }

    if (!orderInfo.deliveryTime) {
      alert('배송 시간을 선택해주세요.')
      return
    }

    // 필수 약관 동의 확인
    if (!agreements.privacy || !agreements.terms || !agreements.refund || !agreements.marketing) {
      alert('필수 약관에 모두 동의해주세요.')
      return
    }

    try {
      setLoading(true)

      // 주문 데이터 생성
      const orderItems = orderData.items.map(item => ({
        productId: orderData.productId,
        productName: orderData.productName,
        options: item.options,
        optionsWithPrices: item.optionsWithPrices || {},
        quantity: item.quantity,
        price: orderData.productPrice,
        itemPrice: item.itemPrice || (orderData.productPrice * item.quantity)
      }))

      const order = {
        userId: user.uid,
        storeId: orderData.storeId,
        storeName: orderData.storeName,
        items: orderItems,
        totalPrice: totalPrice,
        totalProductPrice: totalProductPrice,
        deliveryFee: deliveryFee,
        orderStatus: 'pending' as const,
        paymentStatus: 'unpaid' as const,
        deliveryMethod: deliveryMethod,
        deliveryDate: orderInfo.deliveryDate,
        deliveryTime: orderInfo.deliveryTime,
        address: orderInfo.address,
        detailAddress: orderInfo.detailAddress,
        recipient: recipient,
        orderer: user.displayName || user.email || '주문자',
        phone: orderInfo.phone,
        request: orderInfo.request,
        detailedRequest: detailedRequest
      }

      console.log('=== 주문 생성 디버깅 ===')
      console.log('User UID:', user.uid)
      console.log('Order data:', order)
      console.log('Order userId:', order.userId)
      console.log('User UID match:', order.userId === user.uid)
      console.log('User object:', user)
      console.log('User email:', user.email)
      console.log('User email verified:', user.emailVerified)

      // Firestore에 주문 저장
      const { orderId, orderNumber } = await createOrder(order)
      console.log('주문 생성 완료:', orderId, orderNumber)

      console.log('=== 결제 요청 전 orderInfo 확인 ===')
      console.log('orderInfo:', orderInfo)
      console.log('userEmail:', userEmail)
      console.log('orderInfo.orderer:', orderInfo.orderer)
      console.log('orderInfo.phone:', orderInfo.phone)

      // 포트원 결제 요청
      const paymentResult = await requestPayment({
        orderName: `${orderData.productName} ${orderItems.length > 1 ? `외 ${orderItems.length - 1}건` : ''}`,
        amount: totalPrice,
        orderId: orderId,
        customerName: orderInfo.orderer,
        customerEmail: userEmail,
        customerPhoneNumber: orderInfo.phone,
      })

      if (!paymentResult.success) {
        alert(`결제에 실패했습니다.\n${paymentResult.errorMessage || '알 수 없는 오류'}`)
        return
      }

      // 서버에서 결제 검증
      console.log('결제 검증 시작:', paymentResult.paymentId)
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId: paymentResult.paymentId }),
      })

      const verifyData = await verifyResponse.json()
      console.log('결제 검증 결과:', verifyData)

      if (!verifyData.verified) {
        alert('결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
        return
      }

      // 결제 검증 성공 - 주문 상태 업데이트
      const orderRef = doc(db, 'orders', orderId)
      await setDoc(orderRef, {
        paymentStatus: 'paid',
        paymentId: paymentResult.paymentId,
        transactionId: paymentResult.transactionId,
        paidAt: new Date(),
        verifiedAt: new Date()
      }, { merge: true })

      // 세션 스토리지 클리어
      sessionStorage.removeItem('orderData')

      alert(`결제가 완료되었습니다!\n주문번호: ${orderNumber}`)
      router.push('/orders')
    } catch (error) {
      console.error('주문 생성 실패:', error)
      alert('주문 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 배송지 정보 저장 함수
  const saveDeliveryInfo = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!addressName.trim()) {
      alert('배송지 이름을 입력해주세요.')
      return
    }

    if (!orderInfo.address.trim()) {
      alert('주소를 먼저 입력해주세요.')
      return
    }

    try {
      const newAddress: DeliveryAddress = {
        id: Date.now().toString(),
        name: addressName,
        orderer: recipient || orderInfo.orderer,
        phone: orderInfo.phone,
        email: orderInfo.email,
        address: orderInfo.address,
        detailAddress: orderInfo.detailAddress,
        zipCode: orderInfo.zipCode
      }

      const updatedAddresses = [...savedAddresses, newAddress]

      const userDocRef = doc(db, 'users', user.uid)
      await setDoc(userDocRef, {
        deliveryAddresses: updatedAddresses
      }, { merge: true })

      setSavedAddresses(updatedAddresses)
      alert('배송지 정보가 저장되었습니다.')
    } catch (error) {
      console.error('배송지 정보 저장 실패:', error)
      alert('배송지 정보 저장에 실패했습니다.')
    }
  }

  // 저장된 배송지 불러오기
  const loadAddress = (address: DeliveryAddress) => {
    setOrderInfo({
      orderer: address.orderer,
      phone: address.phone,
      email: address.email,
      detailAddress: address.detailAddress || '',
      address: address.address,
      zipCode: address.zipCode || '',
      deliveryDate: '',
      deliveryTime: '',
      request: ''
    })
    setRecipient(address.orderer)
    setAddressName(address.name)
  }

  // 배송지 삭제
  const deleteAddress = async (addressId: string) => {
    if (!user) return

    if (!confirm('이 배송지를 삭제하시겠습니까?')) return

    try {
      const updatedAddresses = savedAddresses.filter(addr => addr.id !== addressId)

      const userDocRef = doc(db, 'users', user.uid)
      await setDoc(userDocRef, {
        deliveryAddresses: updatedAddresses
      }, { merge: true })

      setSavedAddresses(updatedAddresses)
      alert('배송지가 삭제되었습니다.')
    } catch (error) {
      console.error('배송지 삭제 실패:', error)
      alert('배송지 삭제에 실패했습니다.')
    }
  }

  // 퀵업체 배송만 25,000원 추가
  const deliveryFee = deliveryMethod === '퀵업체 배송' ? 25000 : 0
  const totalProductPrice = orderData
    ? orderData.items.reduce((sum, item) => {
        // itemPrice가 있으면 그것을 사용, 없으면 기본 가격 * 수량
        return sum + (item.itemPrice || (orderData.productPrice * item.quantity))
      }, 0)
    : 0
  const totalPrice = totalProductPrice + deliveryFee - usePoint
  const totalQuantity = orderData
    ? orderData.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0

  if (loading) {
    return (
      <>
        <Header />
        <Loading />
        <Footer />
      </>
    )
  }

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        onLoad={handlePostcodeLoad}
      />
      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>결제하기</h1>

        {/* 주문상품 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>주문상품</h2>
          <div className={styles.productContainer}>
            {orderData && (
              <div className={styles.productList}>
                {orderData.storeName && <div className={styles.storeName}>{orderData.storeName}</div>}
                {orderData.items.map((item, index) => (
                  <div key={index} className={styles.productItem}>
                    {orderData.productImage && (
                      <Image
                        src={orderData.productImage}
                        alt={orderData.productName}
                        width={100}
                        height={100}
                        quality={100}
                        className={styles.productImage}
                      />
                    )}
                    <div className={styles.productInfo}>
                      <div className={styles.productName}>{orderData.productName}</div>
                      {Object.entries(item.options).map(([key, value]) => {
                        // 옵션 가격 찾기
                        let optionPrice = 0
                        if (item.optionsWithPrices && item.optionsWithPrices[key]) {
                          optionPrice = item.optionsWithPrices[key].price
                        }
                        return (
                          <div key={key} className={styles.productOptionWrapper}>
                            <div className={styles.productOptionGroup}>[{key}]</div>
                            <div className={styles.productOption}>
                              {value} +{optionPrice.toLocaleString()}원
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className={styles.productQuantity}>{item.quantity}개</div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </section>

        {/* 배송지 설정 */}
        <DeliveryInfo
          orderInfo={orderInfo}
          recipient={recipient}
          addressName={addressName}
          savedAddresses={savedAddresses}
          onOrderInfoChange={setOrderInfo}
          onRecipientChange={setRecipient}
          onAddressNameChange={setAddressName}
          onAddressSave={saveDeliveryInfo}
          onAddressLoad={loadAddress}
          onAddressDelete={deleteAddress}
          onAddressSearch={handleAddressSearch}
        />

        {/* 배송날짜 및 시간설정 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>배송날짜 및 시간설정</h2>
          <div className={styles.deliveryContainer}>
            <div className={styles.formGroup}>
              <DateTimePicker
                deliveryDate={orderInfo.deliveryDate}
                deliveryTime={orderInfo.deliveryTime}
                onDateChange={(date) => setOrderInfo({...orderInfo, deliveryDate: date})}
                onTimeChange={(time) => setOrderInfo({...orderInfo, deliveryTime: time})}
              />
            </div>
          </div>
        </section>

        {/* 요청사항 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>배달 요청사항</h2>
          <div className={styles.requestContainer}>
            <div className={styles.formRow}>
              <label className={styles.label}>요청사항</label>
              <div className={styles.customSelectWrapper}>
                <div
                  className={styles.customSelect}
                  onClick={() => setShowRequestDropdown(!showRequestDropdown)}
                >
                  <span>{orderInfo.request || '배송 요청사항을 선택해주세요'}</span>
                  <Image
                    src="/icons/arrow.svg"
                    alt="화살표"
                    width={20}
                    height={20}
                    style={{ transform: showRequestDropdown ? 'rotate(-90deg)' : 'rotate(90deg)' }}
                  />
                </div>
                {showRequestDropdown && (
                  <div className={styles.customDropdown}>
                    <div
                      className={styles.dropdownItem}
                      onClick={() => {
                        setOrderInfo({...orderInfo, request: '도착 10분전에 전화주세요.'})
                        setShowRequestDropdown(false)
                      }}
                    >
                      도착 10분전에 전화주세요.
                    </div>
                    <div
                      className={styles.dropdownItem}
                      onClick={() => {
                        setOrderInfo({...orderInfo, request: '문앞에 놓고 문자한번만 주세요.'})
                        setShowRequestDropdown(false)
                      }}
                    >
                      문앞에 놓고 문자한번만 주세요.
                    </div>
                    <div
                      className={styles.dropdownItem}
                      onClick={() => {
                        setOrderInfo({...orderInfo, request: '1층 로비에 맡겨주세요.'})
                        setShowRequestDropdown(false)
                      }}
                    >
                      1층 로비에 맡겨주세요.
                    </div>
                    <div
                      className={styles.dropdownItem}
                      onClick={() => {
                        setOrderInfo({...orderInfo, request: '지정 시간까지 꼭 도착해야 합니다.'})
                        setShowRequestDropdown(false)
                      }}
                    >
                      지정 시간까지 꼭 도착해야 합니다.
                    </div>
                    <div
                      className={styles.dropdownItem}
                      onClick={() => {
                        setOrderInfo({...orderInfo, request: '수령인 이름 꼭 확인하고 전달해주세요.'})
                        setShowRequestDropdown(false)
                      }}
                    >
                      수령인 이름 꼭 확인하고 전달해주세요.
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>공동현관</label>
              <input
                type="text"
                className={styles.inputFull}
                placeholder="집, 회사 공동현관 출입번호를 입력해주세요."
                value={entranceCode}
                onChange={(e) => setEntranceCode(e.target.value)}
              />
            </div>
            <div className={styles.formRowTop}>
              <label className={styles.label}>상세요청</label>
              <textarea
                className={styles.textareaFull}
                placeholder="판매자에게 필요한 상세 요청사항을 적어주세요."
                value={detailedRequest}
                onChange={(e) => setDetailedRequest(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* 배송방법 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>배송방법</h2>
          <div className={styles.deliveryMethodContainer}>
            {orderData?.deliveryMethods?.includes('자체 배송') && (
              <div
                className={`${styles.deliveryMethodBox} ${deliveryMethod === '자체 배송' ? styles.deliveryMethodBoxSelected : ''}`}
                onClick={() => setDeliveryMethod('자체 배송')}
              >
                <div className={styles.deliveryMethodContent}>
                  <div>
                    <span>자체 배송</span>
                    <div className={styles.deliveryMethodDescription}>자체 배송이 가능한 업체 입니다.</div>
                  </div>
                  <span className={styles.deliveryFee}>+0원</span>
                </div>
              </div>
            )}
            {orderData?.deliveryMethods?.includes('매장 픽업') && (
              <div
                className={`${styles.deliveryMethodBox} ${deliveryMethod === '매장 픽업' ? styles.deliveryMethodBoxSelected : ''}`}
                onClick={() => setDeliveryMethod('매장 픽업')}
              >
                <div className={styles.deliveryMethodContent}>
                  <div>
                    <span>매장 픽업</span>
                    <div className={styles.deliveryMethodDescription}>매장 픽업이 가능한 업체 입니다.</div>
                  </div>
                  <span className={styles.deliveryFee}>+0원</span>
                </div>
              </div>
            )}
            {orderData?.deliveryMethods?.includes('퀵업체 배송') && (
              <div
                className={`${styles.deliveryMethodBox} ${deliveryMethod === '퀵업체 배송' ? styles.deliveryMethodBoxSelected : ''}`}
                onClick={() => setDeliveryMethod('퀵업체 배송')}
              >
                <div className={styles.deliveryMethodContent}>
                  <div>
                    <span>퀵업체 배송</span>
                    <div className={styles.deliveryMethodDescription}>퀵업체 배송이 가능한 업체 입니다.</div>
                  </div>
                  <span className={styles.deliveryFee}>+25,000원</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 총 결제금액 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>총 결제금액</h2>
          <div className={styles.paymentContainer}>
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>총 상품금액</span>
              <span className={styles.paymentValue}>{totalQuantity}개</span>
            </div>
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>총 상품금액</span>
              <div className={styles.priceValue}>
                {orderData && orderData.originalPrice && orderData.discount && (
                  <span style={{
                    textDecoration: 'line-through',
                    color: '#999',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginRight: '8px'
                  }}>
                    {orderData.originalPrice.toLocaleString()}원
                  </span>
                )}
                <span className={styles.paymentValue}>{totalProductPrice.toLocaleString()}원</span>
              </div>
            </div>
            <div className={styles.paymentRow}>
              <span className={styles.paymentLabel}>배송비</span>
              <span className={styles.paymentValue}>+{deliveryFee.toLocaleString()}원</span>
            </div>
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
                      if (value <= availablePoint && value >= 0) {
                        setUsePoint(value)
                      } else if (e.target.value === '') {
                        setUsePoint(0)
                      }
                    }}
                  />
                </div>
                <div className={styles.pointBottomRow}>
                  <span className={styles.availablePoint}>사용 가능 : {availablePoint.toLocaleString()}P</span>
                  <button
                    type="button"
                    className={styles.useAllButton}
                    onClick={() => setUsePoint(availablePoint)}
                  >
                    전액 사용
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.paymentTotal}>
              <span>총 결제금액</span>
              <span className={styles.finalPrice}>{totalPrice.toLocaleString()}원</span>
            </div>
          </div>
        </section>

        {/* 약관 동의 */}
        <section className={styles.section}>
          <div className={styles.agreementsContainer}>
            <label className={styles.agreementLabelAll}>
              <div className={styles.checkboxTextWrapper}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    checked={agreeAll}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setAgreeAll(checked)
                      setAgreements({
                        privacy: checked,
                        terms: checked,
                        refund: checked,
                        marketing: checked
                      })
                    }}
                  />
                  <Image
                    src={agreeAll ? '/icons/check_active.png' : '/icons/check_empty.png'}
                    alt="체크박스"
                    width={20}
                    height={20}
                    className={styles.checkboxIcon}
                  />
                </div>
                <span className={styles.agreementMainText}>주문내용을 확인 및 결제 동의</span>
              </div>
            </label>
            <label className={styles.agreementLabelItem}>
              <div className={styles.checkboxTextWrapper}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    checked={agreements.privacy}
                    onChange={(e) => {
                      setAgreements({...agreements, privacy: e.target.checked})
                      setAgreeAll(false)
                    }}
                  />
                  <Image
                    src={agreements.privacy ? '/icons/check_active.png' : '/icons/check_empty.png'}
                    alt="체크박스"
                    width={20}
                    height={20}
                    className={styles.checkboxIcon}
                  />
                </div>
                <span>(필수) 개인정보 수집 · 이용 동의</span>
              </div>
            </label>
            <label className={styles.agreementLabelItem}>
              <div className={styles.checkboxTextWrapper}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    checked={agreements.terms}
                    onChange={(e) => {
                      setAgreements({...agreements, terms: e.target.checked})
                      setAgreeAll(false)
                    }}
                  />
                  <Image
                    src={agreements.terms ? '/icons/check_active.png' : '/icons/check_empty.png'}
                    alt="체크박스"
                    width={20}
                    height={20}
                    className={styles.checkboxIcon}
                  />
                </div>
                <span>(필수) 개인정보 제3자 정보제공 동의</span>
              </div>
            </label>
            <label className={styles.agreementLabelItem}>
              <div className={styles.checkboxTextWrapper}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    checked={agreements.refund}
                    onChange={(e) => {
                      setAgreements({...agreements, refund: e.target.checked})
                      setAgreeAll(false)
                    }}
                  />
                  <Image
                    src={agreements.refund ? '/icons/check_active.png' : '/icons/check_empty.png'}
                    alt="체크박스"
                    width={20}
                    height={20}
                    className={styles.checkboxIcon}
                  />
                </div>
                <span>(필수) 결제대행 서비스 이용약관 동의</span>
              </div>
            </label>
            <label className={styles.agreementLabelItem}>
              <div className={styles.checkboxTextWrapper}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    checked={agreements.marketing}
                    onChange={(e) => {
                      setAgreements({...agreements, marketing: e.target.checked})
                      setAgreeAll(false)
                    }}
                  />
                  <Image
                    src={agreements.marketing ? '/icons/check_active.png' : '/icons/check_empty.png'}
                    alt="체크박스"
                    width={20}
                    height={20}
                    className={styles.checkboxIcon}
                  />
                </div>
                <span>(필수) 주문정보 비밀번호 개인정보 수집 · 이용 동의</span>
              </div>
            </label>
          </div>
        </section>

        {/* 버튼 */}
        <div className={styles.buttonGroup}>
          <button
            className={styles.cancelButton}
            onClick={() => router.back()}
          >
            취소
          </button>
          <button
            className={styles.payButton}
            onClick={handlePayment}
          >
            결제하기
          </button>
        </div>
      </div>
      <Footer />
    </>
  )
}
