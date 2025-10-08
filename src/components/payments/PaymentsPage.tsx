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
import DeliveryAddressModal from './DeliveryAddressModal'
import SaveAddressDialog from './SaveAddressDialog'
import DateTimePicker from './DateTimePicker'
import { OrderData, DeliveryAddress } from './types'
import { createOrder } from '@/lib/services/orderService'
import styles from './PaymentsPage.module.css'

interface DaumPostcodeData {
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: 'R' | 'J';
}

interface DaumPostcode {
  new(options: { oncomplete: (data: DaumPostcodeData) => void }): { open: () => void };
}

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcode;
    };
  }
}

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
    address: '',
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
  const [showAddressList, setShowAddressList] = useState(false)
  const [addressName, setAddressName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isPostcodeLoaded, setIsPostcodeLoaded] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [detailedRequest, setDetailedRequest] = useState('')

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

        // Firestore에서 저장된 배송지 목록 불러오기
        if (user) {
          const userDocRef = doc(db, 'users', user.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.deliveryAddresses) {
              setSavedAddresses(userData.deliveryAddresses)
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
            address: addr
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
        quantity: item.quantity,
        price: orderData.productPrice
      }))

      const order = {
        userId: user.uid,
        storeId: orderData.storeId,
        storeName: orderData.storeName,
        items: orderItems,
        totalAmount: totalPrice,
        status: 'pending' as const,
        paymentMethod: '결제 대기',
        deliveryAddress: `${orderInfo.address} ${orderInfo.email}`,
        phoneNumber: orderInfo.phone,
        requestNote: `${orderInfo.request}\n배송일시: ${orderInfo.deliveryDate} ${orderInfo.deliveryTime}\n상세요청: ${detailedRequest}`
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
      const orderId = await createOrder(order)
      console.log('주문 생성 완료:', orderId)

      // TODO: 포트원 결제 연동
      // 현재는 임시로 주문만 생성하고 완료 처리
      alert(`주문이 생성되었습니다.\n주문번호: ${orderId}\n\n※ 결제 기능은 추후 포트원 연동 예정입니다.`)

      // 세션 스토리지 클리어
      sessionStorage.removeItem('orderData')

      // 주문 완료 페이지로 이동 (추후 구현)
      router.push('/') // 임시로 홈으로 이동
    } catch (error) {
      console.error('주문 생성 실패:', error)
      alert('주문 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 배송지 저장 다이얼로그 열기
  const openSaveDialog = () => {
    if (!orderInfo.address.trim()) {
      alert('주소를 먼저 입력해주세요.');
      return;
    }
    setShowSaveDialog(true)
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
        orderer: orderInfo.orderer,
        phone: orderInfo.phone,
        email: orderInfo.email,
        address: orderInfo.address,
        deliveryDate: orderInfo.deliveryDate,
        deliveryTime: orderInfo.deliveryTime,
        request: orderInfo.request
      }

      const updatedAddresses = [...savedAddresses, newAddress]

      const userDocRef = doc(db, 'users', user.uid)
      await setDoc(userDocRef, {
        deliveryAddresses: updatedAddresses
      }, { merge: true })

      setSavedAddresses(updatedAddresses)
      setAddressName('')
      setShowSaveDialog(false)
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
      address: address.address,
      deliveryDate: address.deliveryDate,
      deliveryTime: address.deliveryTime,
      request: address.request
    })
    setShowAddressList(false)
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
    ? orderData.items.reduce((sum, item) => sum + (orderData.productPrice * item.quantity), 0)
    : 0
  const totalPrice = totalProductPrice + deliveryFee
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
                      {Object.entries(item.options).map(([key, value]) => (
                        <div key={key} className={styles.productOption}>
                          {key}: {value}
                        </div>
                      ))}
                      <div className={styles.productQuantity}>상품수 : {item.quantity}개</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.priceRow}>
              <span>상품금액</span>
              <span>{totalProductPrice.toLocaleString()}원</span>
            </div>
            <div className={styles.priceRow}>
              <span>포인트 사용</span>
              <span className={styles.discount}>-0원</span>
            </div>
            <div className={styles.totalRow}>
              <span>최종 상품금액</span>
              <span className={styles.totalPrice}>{totalProductPrice.toLocaleString()}원</span>
            </div>
          </div>
        </section>

        {/* 배송방법 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>배송방법</h2>
          <div className={styles.radioGroup}>
            {orderData?.deliveryMethods?.includes('자체 배송') && (
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="자체 배송"
                  checked={deliveryMethod === '자체 배송'}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                />
                <span>자체 배송</span>
                <span className={styles.deliveryFee}>+0원</span>
              </label>
            )}
            {orderData?.deliveryMethods?.includes('매장 픽업') && (
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="매장 픽업"
                  checked={deliveryMethod === '매장 픽업'}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                />
                <span>매장 픽업</span>
                <span className={styles.deliveryFee}>+0원</span>
              </label>
            )}
            {orderData?.deliveryMethods?.includes('퀵업체 배송') && (
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="퀵업체 배송"
                  checked={deliveryMethod === '퀵업체 배송'}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                />
                <span>퀵업체 배송</span>
                <span className={styles.deliveryFee}>+25,000원</span>
              </label>
            )}
          </div>
        </section>

        {/* 배송지 정보 */}
        <section className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className={styles.sectionTitle}>
              배송지 정보
              <span className={styles.required}>*모든 항목은 필수 입니다.</span>
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddressList(!showAddressList)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  배송지 목록 ({savedAddresses.length})
                </button>
              )}
              <button
                type="button"
                onClick={openSaveDialog}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                배송지 저장
              </button>
            </div>
          </div>

          {/* 배송지 목록 모달 */}
          <DeliveryAddressModal
            show={showAddressList}
            addresses={savedAddresses}
            onClose={() => setShowAddressList(false)}
            onLoadAddress={loadAddress}
            onDeleteAddress={deleteAddress}
          />

          {/* 배송지 저장 다이얼로그 */}
          <SaveAddressDialog
            show={showSaveDialog}
            addressName={addressName}
            onAddressNameChange={setAddressName}
            onSave={saveDeliveryInfo}
            onClose={() => {
              setShowSaveDialog(false)
              setAddressName('')
            }}
          />

          <div className={styles.formGroup}>
            <div className={styles.formRow}>
              <label className={styles.label}>주문자</label>
              <input
                type="text"
                className={styles.input}
                placeholder="주문자 이름을 입력해주세요."
                value={orderInfo.orderer}
                onChange={(e) => setOrderInfo({...orderInfo, orderer: e.target.value})}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>연락처</label>
              <input
                type="text"
                className={styles.input}
                placeholder="연락처를 입력해주세요"
                value={orderInfo.phone}
                onChange={(e) => setOrderInfo({...orderInfo, phone: e.target.value})}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>주소</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="주소를 검색해주세요"
                  value={orderInfo.address}
                  readOnly
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  주소 검색
                </button>
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>상세주소</label>
              <input
                type="text"
                className={styles.input}
                placeholder="상세주소를 입력해주세요"
                value={orderInfo.email}
                onChange={(e) => setOrderInfo({...orderInfo, email: e.target.value})}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>수령인</label>
              <input
                type="text"
                className={styles.input}
                placeholder="수령인 이름을 입력해주세요."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* 배송날짜 및 시간설정 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>배송날짜 및 시간설정</h2>
          <div className={styles.formGroup}>
            <DateTimePicker
              deliveryDate={orderInfo.deliveryDate}
              deliveryTime={orderInfo.deliveryTime}
              onDateChange={(date) => setOrderInfo({...orderInfo, deliveryDate: date})}
              onTimeChange={(time) => setOrderInfo({...orderInfo, deliveryTime: time})}
            />
          </div>
        </section>

        {/* 요청사항 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>요청사항</h2>
          <div className={styles.formGroup}>
            <div className={styles.formRow}>
              <label className={styles.label}>요청사항</label>
              <select
                className={styles.select}
                value={orderInfo.request}
                onChange={(e) => setOrderInfo({...orderInfo, request: e.target.value})}
              >
                <option value="">배송 요청사항을 선택해주세요</option>
                <option value="도착 10분전에 전화주세요.">도착 10분전에 전화주세요.</option>
                <option value="문앞에 놓고 문자한번만 주세요.">문앞에 놓고 문자한번만 주세요.</option>
                <option value="1층 로비에 맡겨주세요.">1층 로비에 맡겨주세요.</option>
                <option value="지정 시간까지 꼭 도착해야 합니다.">지정 시간까지 꼭 도착해야 합니다.</option>
                <option value="수령인 이름 꼭 확인하고 전달해주세요.">수령인 이름 꼭 확인하고 전달해주세요.</option>
              </select>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>상세요청사항</label>
              <textarea
                className={styles.textarea}
                placeholder="판매자에게 필요한 상세 요청사항을 적어주세요."
                value={detailedRequest}
                onChange={(e) => setDetailedRequest(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* 총 결제금액 */}
        <section className={styles.paymentSection}>
          <h2 className={styles.sectionTitle}>총 결제금액</h2>
          <div className={styles.paymentRow}>
            <span>총 상품금액</span>
            <span>{totalQuantity}개</span>
          </div>
          <div className={styles.paymentRow}>
            <span>배송비</span>
            <span>+{deliveryFee.toLocaleString()}원</span>
          </div>
          <div className={styles.paymentTotal}>
            <span>총 결제금액</span>
            <span className={styles.finalPrice}>{totalPrice.toLocaleString()}원</span>
          </div>

          <div className={styles.agreements}>
            <h3 className={styles.agreementTitle}>주문내용을 확인 및 결제 동의</h3>
            <label className={styles.agreementLabel}>
              <input
                type="checkbox"
                checked={agreements.privacy}
                onChange={(e) => setAgreements({...agreements, privacy: e.target.checked})}
              />
              <span>(필수) 개인정보 수집 · 이용 동의</span>
            </label>
            <label className={styles.agreementLabel}>
              <input
                type="checkbox"
                checked={agreements.terms}
                onChange={(e) => setAgreements({...agreements, terms: e.target.checked})}
              />
              <span>(필수) 개인정보 제3자 정보제공 동의</span>
            </label>
            <label className={styles.agreementLabel}>
              <input
                type="checkbox"
                checked={agreements.refund}
                onChange={(e) => setAgreements({...agreements, refund: e.target.checked})}
              />
              <span>(필수) 결제대행 서비스 이용약관 동의</span>
            </label>
            <label className={styles.agreementLabel}>
              <input
                type="checkbox"
                checked={agreements.marketing}
                onChange={(e) => setAgreements({...agreements, marketing: e.target.checked})}
              />
              <span>(필수) 주문정보 비밀번호 개인정보 수집 · 이용 동의</span>
            </label>
          </div>

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
        </section>
      </div>
      <Footer />
    </>
  )
}
