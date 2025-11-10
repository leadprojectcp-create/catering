'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Loading from '@/components/Loading'

export default function PaymentCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')
  const [orderNumber, setOrderNumber] = useState<string>('')

  useEffect(() => {
    const handlePaymentComplete = async () => {
      try {
        // URL 파라미터 추출
        const impUid = searchParams.get('imp_uid')
        const merchantUid = searchParams.get('merchant_uid')
        const orderId = searchParams.get('orderId')
        const impSuccess = searchParams.get('imp_success')

        console.log('=== 모바일 결제 완료 처리 ===')
        console.log('imp_uid:', impUid)
        console.log('merchant_uid:', merchantUid)
        console.log('orderId:', orderId)
        console.log('imp_success:', impSuccess)

        // 필수 파라미터 확인
        if (!impUid || !orderId) {
          throw new Error('결제 정보가 올바르지 않습니다.')
        }

        // imp_success가 false인 경우 결제 실패
        if (impSuccess === 'false') {
          throw new Error('결제가 취소되었습니다.')
        }

        // 백엔드 API로 주문 처리 요청
        const response = await fetch('/api/payments/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imp_uid: impUid,
            merchant_uid: merchantUid,
            orderId: orderId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '주문 처리에 실패했습니다.')
        }

        const result = await response.json()
        console.log('주문 처리 완료:', result)

        setOrderNumber(result.orderNumber)
        setStatus('success')

        // 2초 후 주문 페이지로 이동
        setTimeout(() => {
          router.push('/orders')
        }, 2000)

      } catch (error) {
        console.error('결제 처리 오류:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.')
      }
    }

    handlePaymentComplete()
  }, [searchParams, router])

  if (status === 'verifying') {
    return <Loading />
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      {status === 'success' && (
        <>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            color: 'white'
          }}>
            ✓
          </div>
          <h2 style={{ marginTop: '20px', fontSize: '20px', fontWeight: '600' }}>
            결제가 완료되었습니다!
          </h2>
          {orderNumber && (
            <p style={{ marginTop: '10px', color: '#333', fontSize: '16px', fontWeight: '600' }}>
              주문번호: {orderNumber}
            </p>
          )}
          <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
            주문 페이지로 이동합니다...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#f44336',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            color: 'white'
          }}>
            ✕
          </div>
          <h2 style={{ marginTop: '20px', fontSize: '20px', fontWeight: '600' }}>
            결제 처리 실패
          </h2>
          <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
            {errorMessage}
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#025BD9',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            홈으로 돌아가기
          </button>
        </>
      )}
    </div>
  )
}
