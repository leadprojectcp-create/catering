'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Script from 'next/script'
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, increment, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import DeliveryInfo from './DeliveryInfo'
import DateTimePicker from './DateTimePicker'
import { OrderData, DeliveryAddress, DaumPostcodeData, OrderInfo } from './types'
import PrivacyPolicy from '@/components/terms/PrivacyPolicy'
import RefundPolicy from '@/components/terms/RefundPolicy'
import PaymentTerms from './PaymentTerms'
import { requestPayment, PayMethod } from '@/lib/services/paymentService'
import OptimizedImage from '@/components/common/OptimizedImage'
import styles from './PaymentsPage.module.css'

// 결제 수단 타입 (UI용)
type PayMethodUI = 'card' | 'trans' | 'vbank' | 'payco' | 'samsung' | 'kakao' | 'naver' | 'toss' | 'apple'

// UI 결제 수단을 포트원 API 값으로 매핑
const mapPayMethodToPortOne = (method: PayMethodUI): { payMethod: PayMethod; easyPayProvider?: string } => {
  if (method === 'card') return { payMethod: 'CARD' }
  if (method === 'trans') return { payMethod: 'TRANSFER' }
  if (method === 'vbank') return { payMethod: 'VIRTUAL_ACCOUNT' }
  if (method === 'payco') return { payMethod: 'EASY_PAY', easyPayProvider: 'PAYCO' }
  if (method === 'samsung') return { payMethod: 'EASY_PAY', easyPayProvider: 'SAMSUNGPAY' }
  if (method === 'kakao') return { payMethod: 'EASY_PAY', easyPayProvider: 'KAKAOPAY' }
  if (method === 'naver') return { payMethod: 'EASY_PAY', easyPayProvider: 'NAVERPAY' }
  if (method === 'toss') return { payMethod: 'EASY_PAY', easyPayProvider: 'TOSSPAY' }
  if (method === 'apple') return { payMethod: 'EASY_PAY', easyPayProvider: 'APPLEPAY' }

  return { payMethod: 'CARD' }
}

export default function PaymentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState('pickup')
  const [payMethod, setPayMethod] = useState<PayMethodUI>('card')
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
  const [showRequestDropdown, setShowRequestDropdown] = useState(false)
  const [agreeAll, setAgreeAll] = useState(false)
  const [showDateInfoModal, setShowDateInfoModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState<string | null>(null)
  const [usePoint, setUsePoint] = useState(0)
  const [availablePoint, setAvailablePoint] = useState(0)
  const [minOrderDays, setMinOrderDays] = useState(0)
  const [deliveryFeeFromAPI, setDeliveryFeeFromAPI] = useState<number | null>(null)
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState(false)
  const [deliveryFeeSettings, setDeliveryFeeSettings] = useState<{
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    paymentMethods?: ('선결제' | '착불')[]
    perQuantity?: number
  } | null>(null)
  const [parcelPaymentMethod, setParcelPaymentMethod] = useState<'선결제' | '착불'>('선결제')

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
            // paymentMethods가 있으면 첫 번째 값을 기본값으로 설정
            if (productData.deliveryFeeSettings.paymentMethods && productData.deliveryFeeSettings.paymentMethods.length > 0) {
              setParcelPaymentMethod(productData.deliveryFeeSettings.paymentMethods[0])
            }
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
          minOrderDays: minOrderDays
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

    // 퀵업체 배송일 때만 주소 검증
    if (deliveryMethod === '퀵업체 배송') {
      if (!orderInfo.address.trim()) {
        alert('주소를 입력해주세요.')
        return
      }
    }

    if (!recipient.trim()) {
      alert('수령인 이름을 입력해주세요.')
      return
    }

    if (!orderInfo.deliveryDate) {
      alert('배송 날짜를 선택해주세요.')
      return
    }

    // 택배 배송이 아닐 때만 시간 검증
    if (deliveryMethod !== '택배 배송' && !orderInfo.deliveryTime) {
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

      if (!orderId) {
        alert('주문 정보가 없습니다.')
        return
      }

      // cartId로 들어온 경우 shoppingCart에서 orders로 데이터 이동
      const cartIdParam = searchParams.get('cartId')
      let finalOrderId = orderId

      if (cartIdParam) {
        // shoppingCart에서 데이터 가져오기
        const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
        const cartDocSnap = await getDoc(cartDocRef)

        if (!cartDocSnap.exists()) {
          alert('장바구니 정보를 찾을 수 없습니다.')
          return
        }

        const cartData = cartDocSnap.data()

        // orders 컬렉션에 새로운 문서 생성
        const newOrderData = {
          uid: cartData.uid,
          productId: cartData.productId,
          storeId: cartData.storeId,
          storeName: cartData.storeName,
          items: cartData.items,
          totalProductPrice: cartData.totalProductPrice,
          totalQuantity: cartData.totalQuantity,
          deliveryMethod: cartData.deliveryMethod,
          request: cartData.request,
          createdAt: cartData.createdAt || new Date(),
          updatedAt: new Date()
        }

        const newOrderRef = await addDoc(collection(db, 'orders'), newOrderData)
        finalOrderId = newOrderRef.id
        console.log('shoppingCart에서 orders로 이동 완료:', finalOrderId)
      }

      // 가게 정보 가져오기 (partnerId와 partnerPhone을 위해)
      const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
      const storeData = storeDoc.exists() ? storeDoc.data() : null

      // 주문 문서 가져오기
      const orderDocRef = doc(db, 'orders', finalOrderId)
      const orderDocSnap = await getDoc(orderDocRef)

      if (!orderDocSnap.exists()) {
        alert('주문 정보를 찾을 수 없습니다.')
        return
      }

      // 주문번호 생성
      const orderNumber = `ORD${Date.now()}`

      // 주문 문서 업데이트 (배송 정보 추가)
      await updateDoc(orderDocRef, {
        partnerId: storeData?.partnerId,
        partnerPhone: storeData?.phone,
        storeName: storeData?.storeName, // 출발지 상호명
        totalPrice: totalPrice,
        totalProductPrice: totalProductPrice,
        deliveryFee: deliveryFee,
        deliveryMethod: deliveryMethod,
        payMethod: payMethod, // 선택한 결제 수단 저장
        usedPoint: usePoint, // 사용한 포인트 저장
        // 배송 정보를 Map 형태로 저장
        deliveryInfo: {
          addressName: addressName, // 배송지명
          deliveryDate: orderInfo.deliveryDate,
          deliveryTime: orderInfo.deliveryTime,
          address: orderInfo.address,
          detailAddress: orderInfo.detailAddress,
          entrancePassword: entranceCode || '', // 공동현관 비밀번호
          recipient: recipient,
          recipientPhone: orderInfo.phone, // 받는 사람 연락처
          deliveryRequest: deliveryRequest, // 배달 요청사항 (드롭다운)
          detailedRequest: detailedRequest, // 상세요청
        },
        orderer: orderInfo.orderer,
        phone: orderInfo.phone,
        // request는 OrderPage에서 저장한 매장 요청사항이므로 유지
        orderNumber: orderNumber,
        orderStatus: 'pending',
        paymentStatus: 'unpaid',
        updatedAt: new Date()
      })

      console.log('주문 업데이트 완료:', finalOrderId, orderNumber)

      console.log('=== 결제 요청 전 orderInfo 확인 ===')
      console.log('orderInfo:', orderInfo)
      console.log('userEmail:', userEmail)
      console.log('orderInfo.orderer:', orderInfo.orderer)
      console.log('orderInfo.phone:', orderInfo.phone)

      // 포트원 결제 요청
      const paymentConfig = mapPayMethodToPortOne(payMethod)
      const paymentResult = await requestPayment({
        orderName: `${orderData.productName} ${orderData.items.length > 1 ? `외 ${orderData.items.length - 1}건` : ''}`,
        amount: totalPrice,
        orderId: finalOrderId,
        customerName: orderInfo.orderer,
        customerEmail: userEmail,
        customerPhoneNumber: orderInfo.phone,
        payMethod: paymentConfig.payMethod,
        easyPayProvider: paymentConfig.easyPayProvider,
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
      const orderRef = doc(db, 'orders', finalOrderId)
      await setDoc(orderRef, {
        paymentStatus: 'paid',
        paymentId: paymentResult.paymentId,
        transactionId: paymentResult.transactionId,
        paidAt: new Date(),
        verifiedAt: new Date()
      }, { merge: true })

      // 포인트 사용한 경우 처리
      if (usePoint > 0 && user) {
        try {
          // users 컬렉션에서 포인트 차감
          const userRef = doc(db, 'users', user.uid)
          await updateDoc(userRef, {
            point: increment(-usePoint)
          })

          // points 컬렉션에 포인트 사용 내역 저장
          await addDoc(collection(db, 'points'), {
            uid: user.uid,
            amount: -usePoint,
            type: 'used',
            reason: '주문 결제 시 포인트 사용',
            orderId: finalOrderId,
            productId: orderData?.productId || '',
            productName: orderData?.productName || '',
            createdAt: serverTimestamp()
          })

          console.log('포인트 사용 처리 완료:', usePoint)
        } catch (pointError) {
          console.error('포인트 사용 처리 실패:', pointError)
          // 포인트 처리 실패해도 결제는 완료된 상태이므로 계속 진행
        }
      }

      // 퀵 배송은 웹훅에서 자동으로 처리됨

      // 장바구니에서 온 경우 장바구니 삭제
      if (cartIdParam) {
        try {
          const cartDocRef = doc(db, 'shoppingCart', cartIdParam)
          await deleteDoc(cartDocRef)
          console.log('장바구니 삭제 완료:', cartIdParam)
        } catch (cartDeleteError) {
          console.error('장바구니 삭제 실패:', cartDeleteError)
          // 장바구니 삭제 실패해도 주문은 완료된 상태이므로 계속 진행
        }
      }

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

  // 배송비 조회 함수
  const handleDeliveryFeeInquiry = async () => {
    if (deliveryMethod !== '퀵업체 배송') {
      alert('퀵업체 배송만 요금 조회가 가능합니다.')
      return
    }

    if (!orderInfo.address) {
      alert('배송지 주소를 먼저 입력해주세요.')
      return
    }

    if (!orderInfo.deliveryDate) {
      alert('배송 날짜를 먼저 선택해주세요.')
      return
    }

    if (!orderInfo.deliveryTime) {
      alert('배송 시간을 먼저 선택해주세요.')
      return
    }

    if (!orderData?.storeId) {
      alert('가게 정보를 찾을 수 없습니다.')
      return
    }

    setIsLoadingDeliveryFee(true)
    try {
      // 가게 정보 가져오기
      const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
      if (!storeDoc.exists()) {
        alert('가게 정보를 찾을 수 없습니다.')
        setIsLoadingDeliveryFee(false)
        return
      }

      const storeData = storeDoc.data()

      // 출발지 주소 (가게 주소)
      const startAddress = storeData?.address
        ? `${storeData.address.city || ''} ${storeData.address.district || ''} ${storeData.address.dong || ''}`.trim()
        : ''

      if (!startAddress) {
        alert('가게 주소 정보를 찾을 수 없습니다.')
        setIsLoadingDeliveryFee(false)
        return
      }

      // 도착지 주소
      const destAddress = orderInfo.address

      // 예약일시
      const reservDatetimeUp = orderInfo.deliveryDate && orderInfo.deliveryTime
        ? `${orderInfo.deliveryDate} ${orderInfo.deliveryTime}:00`
        : undefined

      console.log('[배송비 조회] 배송날짜:', orderInfo.deliveryDate)
      console.log('[배송비 조회] 배송시간:', orderInfo.deliveryTime)
      console.log('[배송비 조회] reservDatetimeUp:', reservDatetimeUp)

      const response = await fetch('/api/quick-delivery/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceType: 'damas',
          startAddress,
          destAddress,
          runtype: 0,
          reservDatetimeUp,
          upWay: 'free_customer',
          downWay: 'free_customer',
          deliveryItem: {
            bgBox: 1
          }
        }),
      })

      const result = await response.json()

      if (response.ok && result.data?.feeDetails?.feeTotal) {
        setDeliveryFeeFromAPI(result.data.feeDetails.feeTotal)
      } else {
        alert(`배송비 조회 실패: ${result.errMsg || result.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('배송비 조회 에러:', error)
      alert('배송비 조회에 실패했습니다.')
    } finally {
      setIsLoadingDeliveryFee(false)
    }
  }

  // 먼저 총 상품금액과 수량 계산
  const totalProductPrice = orderData
    ? orderData.items.reduce((sum, item) => {
        // itemPrice가 있으면 그것을 사용, 없으면 기본 가격 * 수량
        return sum + (item.itemPrice || (orderData.productPrice * item.quantity))
      }, 0)
    : 0
  const totalQuantity = orderData
    ? orderData.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0

  // 배송비 계산
  const calculateParcelDeliveryFee = () => {
    if (!deliveryFeeSettings) return 0
    if (parcelPaymentMethod === '착불') return 0 // 착불은 배송비 0원

    const { type, baseFee = 0, freeCondition = 0, perQuantity = 0 } = deliveryFeeSettings

    if (type === '무료') return 0
    if (type === '조건부 무료') {
      return totalProductPrice >= freeCondition ? 0 : baseFee
    }
    if (type === '유료') return baseFee
    if (type === '수량별') {
      if (perQuantity > 0) {
        const times = Math.ceil(totalQuantity / perQuantity)
        return baseFee * times
      }
      return baseFee
    }
    return 0
  }

  // 퀵업체 배송일 때는 API 조회 값, 택배 배송일 때는 계산된 값
  const deliveryFee = deliveryMethod === '퀵업체 배송'
    ? (deliveryFeeFromAPI || 0)
    : deliveryMethod === '택배 배송'
    ? calculateParcelDeliveryFee()
    : 0
  // 배송비 프로모션 (퀵업체 배송이고 배송비가 조회되었을 때만 적용)
  const deliveryPromotion = deliveryMethod === '퀵업체 배송' && deliveryFeeFromAPI ? 10000 : 0
  const totalPrice = totalProductPrice + deliveryFee - deliveryPromotion - usePoint

  if (loading) {
    return <Loading />
  }

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        onLoad={handlePostcodeLoad}
      />
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
                    {orderData.productImage && orderData.productImage.trim() !== '' ? (
                      <Image
                        src={orderData.productImage}
                        alt={orderData.productName}
                        width={100}
                        height={100}
                        quality={100}
                        className={styles.productImage}
                      />
                    ) : (
                      <div className={styles.productImage} style={{ background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#999', fontSize: '12px' }}>이미지 없음</span>
                      </div>
                    )}
                    <div className={styles.productInfo}>
                      <div className={styles.productNameRow}>
                        <div className={styles.productName}>{orderData.productName}</div>
                        {/* 옵션이 없을 때는 수량을 상품명 옆에 표시 */}
                        {Object.keys(item.options).length === 0 && (!item.additionalOptions || Object.keys(item.additionalOptions).length === 0) && (
                          <div className={styles.productQuantity}>{item.quantity}개</div>
                        )}
                      </div>

                      {/* 옵션이나 추가상품이 있을 때만 productDetailsBox 표시 */}
                      {(Object.keys(item.options).length > 0 || (item.additionalOptions && Object.keys(item.additionalOptions).length > 0)) && (
                        <div className={styles.productDetailsBox}>
                          <div className={styles.productDetailsLeft}>
                            {/* 상품 옵션 */}
                            {Object.keys(item.options).length > 0 && (
                              <div className={styles.optionSection}>
                                <div className={styles.optionSectionTitle}>상품 옵션</div>
                                <div className={styles.productOptions}>
                                  {Object.entries(item.options).map(([key, value]) => {
                                    let optionPrice = 0
                                    if (item.optionsWithPrices && item.optionsWithPrices[key]) {
                                      optionPrice = item.optionsWithPrices[key].price
                                    }
                                    return (
                                      <div key={key} className={styles.optionItem}>
                                        <span className={styles.optionGroup}>[{key}]</span>
                                        <span>{value} +{optionPrice.toLocaleString()}원</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 추가상품 */}
                            {item.additionalOptions && Object.keys(item.additionalOptions).length > 0 && (
                              <div className={styles.optionSection}>
                                <div className={styles.optionSectionTitle}>추가상품</div>
                                <div className={styles.productOptions}>
                                  {Object.entries(item.additionalOptions).map(([key, value]) => {
                                    let optionPrice = 0
                                    if (item.additionalOptionsWithPrices && item.additionalOptionsWithPrices[key]) {
                                      optionPrice = item.additionalOptionsWithPrices[key].price
                                    }
                                    return (
                                      <div key={key} className={styles.optionItem}>
                                        <span className={styles.optionGroup}>[{key}]</span>
                                        <span>{value} +{optionPrice.toLocaleString()}원</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className={styles.productDetailsRight}>
                            <div className={styles.productQuantity}>{item.quantity}개</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </section>

        {/* 매장 픽업 - 수령인 정보 */}
        {deliveryMethod === '매장 픽업' && (
          <>
            {/* 수령인 정보 */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>수령인 정보</h2>
              <div className={styles.deliveryContainer}>
                <div className={styles.formGroup}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>수령인</label>
                    <input
                      type="text"
                      className={styles.inputFull}
                      placeholder="수령인 이름을 입력해주세요"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label}>연락처</label>
                    <input
                      type="tel"
                      className={styles.inputFull}
                      placeholder="연락처를 입력해주세요"
                      value={orderInfo.phone}
                      onChange={(e) => setOrderInfo({...orderInfo, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 픽업날짜 및 시간설정 */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                픽업날짜 및 시간설정
                <button
                  className={styles.infoButton}
                  onClick={() => setShowDateInfoModal(true)}
                  type="button"
                >
                  <Image
                    src="/icons/info.svg"
                    alt="정보"
                    width={16}
                    height={16}
                  />
                </button>
              </h2>
              <div className={styles.deliveryContainer}>
                <div className={styles.formGroup}>
                  <DateTimePicker
                    deliveryDate={orderInfo.deliveryDate}
                    deliveryTime={orderInfo.deliveryTime}
                    minOrderDays={minOrderDays}
                    deliveryMethod={deliveryMethod}
                    onDateChange={(date) => setOrderInfo({...orderInfo, deliveryDate: date})}
                    onTimeChange={(time) => setOrderInfo({...orderInfo, deliveryTime: time})}
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {/* 퀵업체 배송 또는 택배 배송 선택시 배송지 설정 표시 */}
        {(deliveryMethod === '퀵업체 배송' || deliveryMethod === '택배 배송') && (
          <>
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
              <h2 className={styles.sectionTitle}>
                {deliveryMethod === '택배 배송' ? '배송날짜설정' : '배송날짜 및 시간설정'}
                <button
                  className={styles.infoButton}
                  onClick={() => setShowDateInfoModal(true)}
                  type="button"
                >
                  <Image
                    src="/icons/info.svg"
                    alt="정보"
                    width={16}
                    height={16}
                  />
                </button>
              </h2>
              <div className={styles.deliveryContainer}>
                <div className={styles.formGroup}>
                  <DateTimePicker
                    deliveryDate={orderInfo.deliveryDate}
                    deliveryTime={orderInfo.deliveryTime}
                    minOrderDays={minOrderDays}
                    deliveryMethod={deliveryMethod}
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
                      <span>{deliveryRequest || '배송 요청사항을 선택해주세요'}</span>
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
                            setDeliveryRequest('도착 10분전에 전화주세요.')
                            setShowRequestDropdown(false)
                          }}
                        >
                          도착 10분전에 전화주세요.
                        </div>
                        <div
                          className={styles.dropdownItem}
                          onClick={() => {
                            setDeliveryRequest('문앞에 놓고 문자한번만 주세요.')
                            setShowRequestDropdown(false)
                          }}
                        >
                          문앞에 놓고 문자한번만 주세요.
                        </div>
                        <div
                          className={styles.dropdownItem}
                          onClick={() => {
                            setDeliveryRequest('1층 로비에 맡겨주세요.')
                            setShowRequestDropdown(false)
                          }}
                        >
                          1층 로비에 맡겨주세요.
                        </div>
                        <div
                          className={styles.dropdownItem}
                          onClick={() => {
                            setDeliveryRequest('지정 시간까지 꼭 도착해야 합니다.')
                            setShowRequestDropdown(false)
                          }}
                        >
                          지정 시간까지 꼭 도착해야 합니다.
                        </div>
                        <div
                          className={styles.dropdownItem}
                          onClick={() => {
                            setDeliveryRequest('수령인 이름 꼭 확인하고 전달해주세요.')
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
                    placeholder="배달기사님에게 필요한 상세 요청사항을 적어주세요."
                    value={detailedRequest}
                    onChange={(e) => setDetailedRequest(e.target.value)}
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {/* 결제 수단 선택 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>결제 수단</h2>
          <div className={styles.paymentMethodContainer}>
            <div
              className={`${styles.paymentMethodBox} ${payMethod === 'card' ? styles.paymentMethodBoxSelected : ''}`}
              onClick={() => setPayMethod('card')}
            >
              <span>신용•체크카드</span>
            </div>
            <div
              className={`${styles.paymentMethodBox} ${payMethod === 'trans' ? styles.paymentMethodBoxSelected : ''}`}
              onClick={() => setPayMethod('trans')}
            >
              <span>퀵계좌이체</span>
            </div>
            <div
              className={`${styles.paymentMethodBox} ${payMethod === 'vbank' ? styles.paymentMethodBoxSelected : ''}`}
              onClick={() => setPayMethod('vbank')}
            >
              <span>가상계좌</span>
            </div>
            <div
              className={`${styles.paymentMethodBox} ${payMethod === 'payco' ? styles.paymentMethodBoxSelected : ''}`}
              onClick={() => setPayMethod('payco')}
            >
              <OptimizedImage
                src="/payments-icons/payco.png"
                alt="PAYCO"
                width={120}
                height={45}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div
              className={`${styles.paymentMethodBox} ${payMethod === 'samsung' ? styles.paymentMethodBoxSelected : ''}`}
              onClick={() => setPayMethod('samsung')}
            >
              <OptimizedImage
                src="/payments-icons/samsungpay.png"
                alt="SAMSUNG PAY"
                width={120}
                height={45}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div
              className={`${styles.paymentMethodBox} ${payMethod === 'kakao' ? styles.paymentMethodBoxSelected : ''}`}
              onClick={() => setPayMethod('kakao')}
            >
              <OptimizedImage
                src="/payments-icons/kakaopay.png"
                alt="KAKAO PAY"
                width={120}
                height={45}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div
              className={`${styles.paymentMethodBox} ${payMethod === 'naver' ? styles.paymentMethodBoxSelected : ''}`}
              onClick={() => setPayMethod('naver')}
            >
              <OptimizedImage
                src="/payments-icons/npay.png"
                alt="NAVER PAY"
                width={120}
                height={45}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div
              className={`${styles.paymentMethodBox} ${payMethod === 'toss' ? styles.paymentMethodBoxSelected : ''}`}
              onClick={() => setPayMethod('toss')}
            >
              <OptimizedImage
                src="/payments-icons/tosspay.png"
                alt="TOSS PAY"
                width={120}
                height={45}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div
              className={`${styles.paymentMethodBox} ${payMethod === 'apple' ? styles.paymentMethodBoxSelected : ''}`}
              onClick={() => setPayMethod('apple')}
            >
              <OptimizedImage
                src="/payments-icons/applepay.png"
                alt="APPLE PAY"
                width={120}
                height={45}
                style={{ objectFit: 'contain' }}
              />
            </div>
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
              <span className={styles.paymentValue}>{totalProductPrice.toLocaleString()}원</span>
            </div>
            {deliveryMethod === '퀵업체 배송' && !deliveryFeeFromAPI && (
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
            {deliveryMethod === '퀵업체 배송' && deliveryFeeFromAPI && (
              <>
                <div className={styles.paymentRow}>
                  <span className={styles.paymentLabel}>배송비</span>
                  <span className={styles.paymentValue}>+{deliveryFee.toLocaleString()}원</span>
                </div>
                <div className={styles.paymentRow}>
                  <span className={styles.paymentLabel}>배송비 프로모션</span>
                  <span className={styles.promotionValue}>-10,000원</span>
                </div>
              </>
            )}
            {deliveryMethod === '택배 배송' && (
              <div className={styles.paymentRow}>
                <span className={styles.paymentLabel}>배송비</span>
                <span className={styles.paymentValue}>
                  {parcelPaymentMethod === '착불'
                    ? '착불 (0원)'
                    : deliveryFeeSettings?.type === '무료'
                    ? '무료'
                    : `+${deliveryFee.toLocaleString()}원`}
                </span>
              </div>
            )}
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
            <label
              className={styles.agreementLabelItem}
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (!target.closest('input') && !target.closest('.checkboxWrapper')) {
                  e.preventDefault()
                  setShowTermsModal('privacy')
                }
              }}
            >
              <div className={styles.checkboxTextWrapper}>
                <div className={`${styles.checkboxWrapper} checkboxWrapper`}>
                  <input
                    type="checkbox"
                    checked={agreements.terms}
                    onChange={(e) => {
                      e.stopPropagation()
                      setAgreements({...agreements, terms: e.target.checked})
                      setAgreeAll(false)
                    }}
                    onClick={(e) => e.stopPropagation()}
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
            <label
              className={styles.agreementLabelItem}
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (!target.closest('input') && !target.closest('.checkboxWrapper')) {
                  e.preventDefault()
                  setShowTermsModal('payment')
                }
              }}
            >
              <div className={styles.checkboxTextWrapper}>
                <div className={`${styles.checkboxWrapper} checkboxWrapper`}>
                  <input
                    type="checkbox"
                    checked={agreements.refund}
                    onChange={(e) => {
                      e.stopPropagation()
                      setAgreements({...agreements, refund: e.target.checked})
                      setAgreeAll(false)
                    }}
                    onClick={(e) => e.stopPropagation()}
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
            <label
              className={styles.agreementLabelItem}
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (!target.closest('input') && !target.closest('.checkboxWrapper')) {
                  e.preventDefault()
                  setShowTermsModal('refund')
                }
              }}
            >
              <div className={styles.checkboxTextWrapper}>
                <div className={`${styles.checkboxWrapper} checkboxWrapper`}>
                  <input
                    type="checkbox"
                    checked={agreements.marketing}
                    onChange={(e) => {
                      e.stopPropagation()
                      setAgreements({...agreements, marketing: e.target.checked})
                      setAgreeAll(false)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Image
                    src={agreements.marketing ? '/icons/check_active.png' : '/icons/check_empty.png'}
                    alt="체크박스"
                    width={20}
                    height={20}
                    className={styles.checkboxIcon}
                  />
                </div>
                <span>(필수) 교환 및 반품 안내약관 동의</span>
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
