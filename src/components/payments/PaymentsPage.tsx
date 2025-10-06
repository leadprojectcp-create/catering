'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Loading from '@/components/Loading'
import styles from './PaymentsPage.module.css'

interface OrderItem {
  options: { [key: string]: string }
  quantity: number
}

interface OrderData {
  storeId: string
  storeName: string
  productId: string
  productName: string
  productPrice: number
  productImage: string
  items: OrderItem[]
}

interface DeliveryAddress {
  id: string
  name: string
  orderer: string
  phone: string
  email: string
  address: string
  deliveryDate: string
  deliveryTime: string
  request: string
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

  // 배송지 저장 다이얼로그 열기
  const openSaveDialog = () => {
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

    try {
      const newAddress: DeliveryAddress = {
        id: Date.now().toString(),
        name: addressName,
        ...orderInfo
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

  const deliveryFee = deliveryMethod === 'delivery' ? 25000 : 0
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
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryMethod"
                value="pickup"
                checked={deliveryMethod === 'pickup'}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              />
              <span>픽업</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryMethod"
                value="delivery"
                checked={deliveryMethod === 'delivery'}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              />
              <span>가게 택 배송</span>
              <span className={styles.deliveryFee}>+25,000원</span>
            </label>
          </div>
          <div className={styles.notice}>
            <p className={styles.noticeText}>
              💡 회, 즉석차, 공동구입 상품만은 입금확인 후
            </p>
            <p className={styles.requiredText}>받으실분의 정보입니다</p>
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

          {/* 배송지 목록 */}
          {showAddressList && (
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px'
            }}>
              <h3 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '600' }}>저장된 배송지</h3>
              {savedAddresses.map((address) => (
                <div
                  key={address.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    marginBottom: '10px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '1px solid #ddd'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '5px' }}>{address.name}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {address.orderer} | {address.phone}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{address.address}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => loadAddress(address)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      불러오기
                    </button>
                    <button
                      onClick={() => deleteAddress(address.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 배송지 저장 다이얼로그 */}
          {showSaveDialog && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '400px'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>배송지 저장</h3>
                <input
                  type="text"
                  placeholder="배송지 이름 (예: 집, 회사)"
                  value={addressName}
                  onChange={(e) => setAddressName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowSaveDialog(false)
                      setAddressName('')
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ccc',
                      color: 'black',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={saveDeliveryInfo}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <div className={styles.formRow}>
              <label className={styles.label}>주문자</label>
              <input
                type="text"
                className={styles.input}
                placeholder="주소를 입력해주세요."
                value={orderInfo.orderer}
                onChange={(e) => setOrderInfo({...orderInfo, orderer: e.target.value})}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>실버수호</label>
              <input
                type="text"
                className={styles.input}
                placeholder="실버수호를 입력해주세요"
                value={orderInfo.phone}
                onChange={(e) => setOrderInfo({...orderInfo, phone: e.target.value})}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>배송지명</label>
              <input
                type="text"
                className={styles.input}
                placeholder="집, 회사, 학교 등 배송지를 입력해주세요."
                value={orderInfo.address}
                onChange={(e) => setOrderInfo({...orderInfo, address: e.target.value})}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>수취인</label>
              <input
                type="text"
                className={styles.input}
                placeholder="이름을 입력해주세요."
              />
            </div>
          </div>
        </section>

        {/* 배송날짜 및 시간설정 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>배송날짜 및 시간설정</h2>
          <div className={styles.formGroup}>
            <div className={styles.formRow}>
              <label className={styles.label}>날짜선택</label>
              <input
                type="text"
                className={styles.input}
                placeholder="배송날짜를 선택해주세요"
                value={orderInfo.deliveryDate}
                onChange={(e) => setOrderInfo({...orderInfo, deliveryDate: e.target.value})}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>시간선택</label>
              <input
                type="text"
                className={styles.input}
                placeholder="배송시간을 선택해주세요"
                value={orderInfo.deliveryTime}
                onChange={(e) => setOrderInfo({...orderInfo, deliveryTime: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* 요청사항 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>요청사항</h2>
          <div className={styles.formGroup}>
            <div className={styles.formRow}>
              <label className={styles.label}>오실사람</label>
              <select className={styles.select}>
                <option>배송시 오실사람을 선택하주세요</option>
              </select>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>상세요청</label>
              <textarea
                className={styles.textarea}
                placeholder="판매자에 필요한 요청사항을 적어주세요."
                value={orderInfo.request}
                onChange={(e) => setOrderInfo({...orderInfo, request: e.target.value})}
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
            <button className={styles.cancelButton}>취소</button>
            <button className={styles.payButton}>결제하기</button>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
