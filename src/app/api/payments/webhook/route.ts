import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('webhook-signature')
    const rawBody = await request.text()

    if (!signature) {
      console.error('No webhook signature provided')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Try both webhook secrets
    const secret1 = process.env.PORTONE_WEBHOOK_SECRET_1
    const secret2 = process.env.PORTONE_WEBHOOK_SECRET_2

    const expectedSignature1 = secret1
      ? crypto.createHmac('sha256', secret1).update(rawBody).digest('base64')
      : null
    const expectedSignature2 = secret2
      ? crypto.createHmac('sha256', secret2).update(rawBody).digest('base64')
      : null

    const isValidSignature =
      signature === expectedSignature1 ||
      signature === expectedSignature2

    if (!isValidSignature) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = JSON.parse(rawBody)
    const { type, data } = body

    console.log('PortOne Webhook received:', { type, data })

    // 결제 완료 이벤트 처리
    if (type === 'Transaction.Paid') {
      const { paymentId, transactionId, orderId } = data

      // 포트원 API로 결제 검증
      const verifyResponse = await fetch(
        `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: {
            Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
          },
        }
      )

      if (!verifyResponse.ok) {
        console.error('Payment verification failed')
        return NextResponse.json(
          { error: 'Payment verification failed' },
          { status: 400 }
        )
      }

      const paymentData = await verifyResponse.json()

      // 결제 상태가 PAID인지 확인
      if (paymentData.status !== 'PAID') {
        console.error('Payment status is not PAID:', paymentData.status)
        return NextResponse.json(
          { error: 'Invalid payment status' },
          { status: 400 }
        )
      }

      // Firestore에서 주문 업데이트
      if (orderId) {
        const orderRef = doc(db, 'orders', orderId)
        await updateDoc(orderRef, {
          paymentStatus: 'paid',
          paymentId: paymentId,
          transactionId: transactionId,
          paidAt: new Date(),
          paymentData: paymentData,
        })

        console.log(`Order ${orderId} updated with payment info`)
      }

      return NextResponse.json({ success: true })
    }

    // 결제 취소 이벤트 처리
    if (type === 'Transaction.Cancelled') {
      const { paymentId, orderId } = data

      if (orderId) {
        const orderRef = doc(db, 'orders', orderId)
        await updateDoc(orderRef, {
          paymentStatus: 'cancelled',
          cancelledAt: new Date(),
        })

        console.log(`Order ${orderId} cancelled`)
      }

      return NextResponse.json({ success: true })
    }

    // 결제 실패 이벤트 처리
    if (type === 'Transaction.Failed') {
      const { paymentId, orderId } = data

      if (orderId) {
        const orderRef = doc(db, 'orders', orderId)
        await updateDoc(orderRef, {
          paymentStatus: 'failed',
          failedAt: new Date(),
        })

        console.log(`Order ${orderId} payment failed`)
      }

      return NextResponse.json({ success: true })
    }

    // 처리하지 않는 이벤트 타입
    console.log('Unhandled webhook type:', type)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
