'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyPayment } from '@/lib/services/paymentService'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function PaymentCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

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

        // 결제 검증
        const verified = await verifyPayment(impUid)

        if (!verified) {
          throw new Error('결제 검증에 실패했습니다.')
        }

        // Firestore 주문 상태 업데이트
        const orderRef = doc(db, 'orders', orderId)
        await updateDoc(orderRef, {
          paymentStatus: 'paid',
          paymentId: impUid,
          merchantUid: merchantUid,
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        console.log('결제 완료 및 주문 업데이트 성공')
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
      {status === 'verifying' && (
        <>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #025BD9',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <h2 style={{ marginTop: '20px', fontSize: '20px', fontWeight: '600' }}>
            결제 확인 중...
          </h2>
          <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
            잠시만 기다려주세요.
          </p>
        </>
      )}

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
