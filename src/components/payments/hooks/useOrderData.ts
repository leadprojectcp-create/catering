import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { User } from 'firebase/auth'
import { OrderData, DeliveryAddress } from '../types'

interface UseOrderDataResult {
  loading: boolean
  orderId: string | null
  orderData: OrderData | null
  deliveryMethod: string
  minOrderDays: number
  quantityRanges: {
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]
  totalQuantity: number
  deliveryFeeSettings: {
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    paymentMethods?: ('선결제' | '착불')[]
    perQuantity?: number
  } | null
  parcelPaymentMethod: '선결제' | '착불'
  savedAddresses: DeliveryAddress[]
  availablePoint: number
  setDeliveryMethod: (method: string) => void
  setParcelPaymentMethod: (method: '선결제' | '착불') => void
  setSavedAddresses: (addresses: DeliveryAddress[]) => void
}

/**
 * 주문 데이터 로딩 및 초기 설정을 담당하는 hook
 */
export function useOrderData(user: User | null): UseOrderDataResult {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState('pickup')
  const [minOrderDays, setMinOrderDays] = useState(0)
  const [deliveryFeeSettings, setDeliveryFeeSettings] = useState<{
    type: '무료' | '조건부 무료' | '유료' | '수량별'
    baseFee?: number
    freeCondition?: number
    paymentMethods?: ('선결제' | '착불')[]
    perQuantity?: number
  } | null>(null)
  const [parcelPaymentMethod, setParcelPaymentMethod] = useState<'선결제' | '착불'>('선결제')
  const [quantityRanges, setQuantityRanges] = useState<{
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]>([])
  const [totalQuantity, setTotalQuantity] = useState(0)
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([])
  const [availablePoint, setAvailablePoint] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      // URL에서 cartId, orderId, additionalOrderId 가져오기
      const cartIdParam = searchParams.get('cartId')
      const orderIdParam = searchParams.get('orderId')
      const additionalOrderIdParam = searchParams.get('additionalOrderId')

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

          // quantityRanges 가져오기
          if (productData.quantityRanges && productData.quantityRanges.length > 0) {
            setQuantityRanges(productData.quantityRanges)
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

        // 추가 주문인 경우 sessionStorage에서 데이터 가져오기
        let items = orderDocData.items
        let totalPrice = orderDocData.totalProductPrice

        if (additionalOrderIdParam) {
          const additionalDataStr = sessionStorage.getItem('additionalOrderData')
          if (additionalDataStr) {
            try {
              const additionalData = JSON.parse(additionalDataStr)
              console.log('[PaymentsPage] sessionStorage에서 추가 주문 데이터 로드:', additionalData)

              // sessionStorage의 추가 주문 items만 사용 (기존 items에 추가하지 않음)
              items = additionalData.items
              totalPrice = additionalData.totalProductPrice
            } catch (error) {
              console.error('[PaymentsPage] sessionStorage 파싱 실패:', error)
            }
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
          items: items,
          totalPrice: totalPrice,
          storeRequest: orderDocData.request || '',
          deliveryMethods: deliveryMethods,
          minOrderDays: minOrderDays,
          deliveryFeeSettings: deliveryFeeSettings || undefined
        }

        console.log('[PaymentsPage] OrderData 생성:', {
          hasItems: !!items,
          itemsLength: items?.length,
          isAdditionalOrder: !!additionalOrderIdParam
        })

        // 총 수량 계산
        const calculatedTotalQuantity = items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
        setTotalQuantity(calculatedTotalQuantity)

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

  return {
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
  }
}
