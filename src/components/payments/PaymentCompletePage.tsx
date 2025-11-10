'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'

export default function PaymentCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  useEffect(() => {
    const handlePaymentComplete = async () => {
      // PortOne V2 redirect 방식: payment_id, tx_id를 쿼리 스트링으로 전달
      const paymentId = searchParams.get('payment_id')
      const txId = searchParams.get('tx_id')
      const code = searchParams.get('code')
      const message = searchParams.get('message')

      console.log('[Payment Complete] URL 파라미터:', {
        payment_id: paymentId,
        tx_id: txId,
        code,
        message,
      })

      // 결제 실패 또는 취소
      if (code) {
        console.error('[Payment Complete] 결제 실패:', { code, message })
        alert(`결제에 실패했습니다: ${message || '알 수 없는 오류'}`)
        router.replace('/payments')
        return
      }

      // 결제 성공 (payment_id가 있고 code가 없으면 성공)
      if (!paymentId) {
        console.error('[Payment Complete] 잘못된 접근 - payment_id 없음')
        router.replace('/payments')
        return
      }

      try {
        // 결제 검증
        console.log('[Payment Complete] 결제 검증 시작:', paymentId)
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: paymentId }),
        })

        const verifyData = await verifyResponse.json()
        console.log('[Payment Complete] 결제 검증 결과:', verifyData)

        if (!verifyData.verified) {
          alert('결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
          router.replace('/payments')
          return
        }

        // 주문 데이터 가져오기
        const pendingOrderDataStr = sessionStorage.getItem('pendingOrderData')
        console.log('[Payment Complete] sessionStorage에서 가져온 데이터:', pendingOrderDataStr)

        if (!pendingOrderDataStr) {
          console.error('[Payment Complete] pendingOrderData 없음')
          alert('주문 정보가 없습니다. 다시 시도해주세요.')
          router.replace('/payments')
          return
        }

        const pendingOrderData = JSON.parse(pendingOrderDataStr)
        console.log('[Payment Complete] 파싱된 주문 데이터:', pendingOrderData)
        console.log('[Payment Complete] 주문 처리 시작')

        // 주문 처리 API 호출
        const processResponse = await fetch('/api/payments/process-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            pendingOrderData
          }),
        })

        const processData = await processResponse.json()
        console.log('[Payment Complete] 주문 처리 응답 상태:', processResponse.status)
        console.log('[Payment Complete] 주문 처리 결과:', processData)

        if (!processResponse.ok || !processData.success) {
          const errorMessage = processData.message || processData.error || '주문 처리에 실패했습니다.'
          alert(`${errorMessage}\n고객센터에 문의해주세요.`)
          router.replace('/payments')
          return
        }

        // 세션 스토리지 정리
        sessionStorage.removeItem('pendingOrderData')
        sessionStorage.removeItem('cartIdForPayment')
        sessionStorage.removeItem('orderData')

        // 결제 완료
        alert(`결제가 완료되었습니다!\n주문번호: ${processData.orderNumber}`)
        router.replace('/orders')
      } catch (error) {
        console.error('[Payment Complete] 처리 중 오류:', error)
        alert('결제 처리 중 오류가 발생했습니다.')
        router.replace('/payments')
      }
    }

    if (searchParams) {
      handlePaymentComplete()
    }
  }, [router, searchParams, user])

  return <Loading />
}
