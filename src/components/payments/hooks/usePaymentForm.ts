import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from 'firebase/auth'

interface OrderInfo {
  orderer: string
  phone: string
  email: string
  detailAddress: string
  address: string
  zipCode: string
  deliveryDate: string
  deliveryTime: string
  request: string
}

interface Agreements {
  privacy: boolean
  terms: boolean
  refund: boolean
  marketing: boolean
}

interface UsePaymentFormResult {
  orderInfo: OrderInfo
  recipient: string
  addressName: string
  deliveryRequest: string
  detailedRequest: string
  entranceCode: string
  agreements: Agreements
  agreeAll: boolean
  usePoint: number
  setOrderInfo: (info: OrderInfo) => void
  setRecipient: (recipient: string) => void
  setAddressName: (name: string) => void
  setDeliveryRequest: (request: string) => void
  setDetailedRequest: (request: string) => void
  setEntranceCode: (code: string) => void
  setAgreements: (agreements: Agreements) => void
  setAgreeAll: (agreeAll: boolean) => void
  setUsePoint: (point: number) => void
}

/**
 * 결제 페이지 폼 상태 관리 hook
 */
export function usePaymentForm(user: User | null, orderId: string | null): UsePaymentFormResult {
  const searchParams = useSearchParams()

  const [orderInfo, setOrderInfo] = useState<OrderInfo>({
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
  const [recipient, setRecipient] = useState('')
  const [addressName, setAddressName] = useState('')
  const [deliveryRequest, setDeliveryRequest] = useState('')
  const [detailedRequest, setDetailedRequest] = useState('')
  const [entranceCode, setEntranceCode] = useState('')
  const [agreements, setAgreements] = useState<Agreements>({
    privacy: false,
    terms: false,
    refund: false,
    marketing: false
  })
  const [agreeAll, setAgreeAll] = useState(false)
  const [usePoint, setUsePoint] = useState(0)

  // 초기 사용자 정보 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!user) return

      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()

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
      }
    }

    loadUserInfo()
  }, [user])

  // 기존 주문 정보 복원 (orders 컬렉션에서 가져온 경우)
  useEffect(() => {
    const loadOrderInfo = async () => {
      const orderIdParam = searchParams.get('orderId')
      const additionalOrderIdParam = searchParams.get('additionalOrderId')

      // 추가 주문인 경우 기존 주문 정보 로드
      if (additionalOrderIdParam) {
        try {
          const originalOrderDoc = await getDoc(doc(db, 'orders', additionalOrderIdParam))
          if (originalOrderDoc.exists()) {
            const originalOrderData = originalOrderDoc.data()

            // 기존 주문의 배송 정보를 복원
            if (originalOrderData.deliveryInfo) {
              const deliveryInfo = originalOrderData.deliveryInfo
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
            }

            // 주문자 정보 복원
            setOrderInfo(prev => ({
              ...prev,
              orderer: originalOrderData.orderer || prev.orderer,
              phone: originalOrderData.phone || prev.phone
            }))
          }
        } catch (error) {
          console.error('기존 주문 정보 로드 실패:', error)
        }
        return
      }

      // orders 컬렉션에서 가져온 경우 기존 주문 정보 복원
      if (orderIdParam && orderId) {
        try {
          const orderDocRef = doc(db, 'orders', orderId)
          const orderDocSnap = await getDoc(orderDocRef)

          if (!orderDocSnap.exists()) return

          const orderDocData = orderDocSnap.data()

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
        } catch (error) {
          console.error('주문 정보 로드 실패:', error)
        }
      }
    }

    loadOrderInfo()
  }, [searchParams, orderId])

  return {
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
  }
}
