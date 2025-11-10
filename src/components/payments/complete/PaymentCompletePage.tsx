'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import { doc, getDoc, updateDoc, addDoc, collection, increment, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { sendOrderAlimtalk } from '@/lib/services/smsService'
import styles from './PaymentCompletePage.module.css'

export default function PaymentCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')
  const [orderNumber, setOrderNumber] = useState('')

  useEffect(() => {
    const processPayment = async () => {
      try {
        const impUid = searchParams.get('imp_uid')
        const merchantUid = searchParams.get('merchant_uid')
        const orderId = searchParams.get('orderId')
        const impSuccess = searchParams.get('imp_success')

        console.log('=== 모바일 결제 완료 처리 ===')
        console.log('imp_uid:', impUid)
        console.log('orderId:', orderId)
        console.log('imp_success:', impSuccess)

        if (!impUid || !orderId) {
          throw new Error('결제 정보가 올바르지 않습니다.')
        }

        if (impSuccess === 'false') {
          throw new Error('결제가 취소되었습니다.')
        }

        if (!user) {
          throw new Error('로그인이 필요합니다.')
        }

        // 결제 검증
        console.log('결제 검증 시작:', impUid)
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imp_uid: impUid }),
        })

        const verifyData = await verifyResponse.json()
        console.log('결제 검증 결과:', verifyData)

        if (!verifyData.verified) {
          throw new Error('결제 검증에 실패했습니다.')
        }

        // 주문 정보 조회
        const orderRef = doc(db, 'orders', orderId)
        const orderSnapshot = await getDoc(orderRef)

        if (!orderSnapshot.exists()) {
          throw new Error('주문 정보를 찾을 수 없습니다.')
        }

        const orderData = orderSnapshot.data()
        console.log('주문 정보:', orderData)

        // 가게 정보 가져오기
        const storeDoc = await getDoc(doc(db, 'stores', orderData.storeId))
        const storeData = storeDoc.exists() ? storeDoc.data() : null

        // 결제 정보 배열 처리
        let paymentInfoArray: any[] = []
        let paymentIdArray: string[] = []

        if (orderData.paymentInfo) {
          paymentInfoArray = Array.isArray(orderData.paymentInfo)
            ? [...orderData.paymentInfo]
            : [orderData.paymentInfo]
        }

        if (orderData.paymentId) {
          paymentIdArray = Array.isArray(orderData.paymentId)
            ? [...orderData.paymentId]
            : [orderData.paymentId]
        }

        // 결제 정보 추가
        if (verifyData.payment) {
          const payment = verifyData.payment
          const normalizedPayment = {
            ...payment,
            status: payment.status?.toLowerCase()
          }
          paymentInfoArray.push(normalizedPayment)
          paymentIdArray.push(impUid)
        }

        // items 배열에 paymentId 추가
        const currentPaymentId = paymentIdArray[paymentIdArray.length - 1]
        const existingItems = orderData.items || []
        const itemsWithPaymentId = existingItems.map((item: any) => ({
          ...item,
          ...(currentPaymentId && { paymentId: currentPaymentId }),
          isAddItem: false
        }))

        // 주문 업데이트
        await updateDoc(orderRef, {
          paymentStatus: 'paid',
          paymentInfo: paymentInfoArray,
          paymentId: paymentIdArray,
          items: itemsWithPaymentId,
          verifiedAt: new Date().toISOString(),
          updatedAt: new Date()
        })

        console.log('✅ 주문 업데이트 완료')

        // 포인트 사용 처리
        if (orderData.usedPoint && orderData.usedPoint > 0) {
          try {
            const userRef = doc(db, 'users', user.uid)
            await updateDoc(userRef, {
              point: increment(-orderData.usedPoint)
            })

            await addDoc(collection(db, 'points'), {
              uid: user.uid,
              amount: -orderData.usedPoint,
              type: 'used',
              reason: '주문 결제 시 포인트 사용',
              orderId: orderId,
              productId: orderData.productId || '',
              productName: orderData.productName || '',
              createdAt: new Date()
            })

            console.log('✅ 포인트 사용 처리 완료')
          } catch (pointError) {
            console.error('포인트 사용 처리 실패:', pointError)
          }
        }

        // 장바구니 삭제 (장바구니에서 온 경우)
        const cartIdFromSession = sessionStorage.getItem('cartIdForPayment')
        if (cartIdFromSession) {
          try {
            const cartDocRef = doc(db, 'shoppingCart', cartIdFromSession)
            await deleteDoc(cartDocRef)
            sessionStorage.removeItem('cartIdForPayment')
            console.log('✅ 장바구니 삭제 완료')
          } catch (cartDeleteError) {
            console.error('장바구니 삭제 실패:', cartDeleteError)
          }
        }

        // 알림톡 발송
        try {
          await sendOrderAlimtalk({
            partnerPhone: storeData?.phone,
            customerPhone: orderData.phone,
            isAdditionalOrder: false,
            storeName: orderData.storeName || '',
            orderNumber: orderData.orderNumber,
            totalQuantity: orderData.totalQuantity,
            totalProductPrice: orderData.totalProductPrice,
            additionalQuantity: 0,
            additionalProductPrice: 0,
          })
          console.log('✅ 알림톡 발송 완료')
        } catch (alimtalkError) {
          console.error('알림톡 발송 실패:', alimtalkError)
        }

        // sessionStorage 정리
        sessionStorage.removeItem('orderData')

        setOrderNumber(orderData.orderNumber)
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

    processPayment()
  }, [searchParams, router, user])

  if (status === 'processing') {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      {status === 'success' && (
        <>
          <div className={styles.successIcon}>
            ✓
          </div>
          <h2 className={styles.title}>
            결제가 완료되었습니다!
          </h2>
          {orderNumber && (
            <p className={styles.orderNumber}>
              주문번호: {orderNumber}
            </p>
          )}
          <p className={styles.message}>
            주문 페이지로 이동합니다...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className={styles.errorIcon}>
            ✕
          </div>
          <h2 className={styles.title}>
            결제 처리 실패
          </h2>
          <p className={styles.message}>
            {errorMessage}
          </p>
          <button
            onClick={() => router.push('/')}
            className={styles.homeButton}
          >
            홈으로 돌아가기
          </button>
        </>
      )}
    </div>
  )
}
