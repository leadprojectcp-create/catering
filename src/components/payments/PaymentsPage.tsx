'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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

  useEffect(() => {
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
    } catch (error) {
      console.error('주문 데이터 파싱 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [])

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
          <h2 className={styles.sectionTitle}>
            배송지 정보
            <span className={styles.required}>*모든 항목은 필수 입니다.</span>
          </h2>
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
