import { useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { OrderData, OrderInfo } from '../types'

interface UseDeliveryFeeInquiryParams {
  deliveryMethod: string
  orderInfo: OrderInfo
  orderData: OrderData | null
  onDeliveryFeeChange: (fee: number | null) => void
}

/**
 * 퀵업체 배송비 조회 기능
 */
export function useDeliveryFeeInquiry({
  deliveryMethod,
  orderInfo,
  orderData,
  onDeliveryFeeChange
}: UseDeliveryFeeInquiryParams) {
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState(false)

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
        onDeliveryFeeChange(result.data.feeDetails.feeTotal)
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

  return {
    isLoadingDeliveryFee,
    handleDeliveryFeeInquiry
  }
}
