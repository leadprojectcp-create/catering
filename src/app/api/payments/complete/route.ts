import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imp_uid, merchant_uid, orderId } = body

    if (!imp_uid || !orderId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    console.log('=== 모바일 결제 완료 API 시작 ===')
    console.log('imp_uid:', imp_uid)
    console.log('merchant_uid:', merchant_uid)
    console.log('orderId:', orderId)

    // 1. PortOne 결제 검증
    const verifyResponse = await fetch('https://api.iamport.kr/payments/' + imp_uid, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!verifyResponse.ok) {
      console.error('PortOne API 오류:', await verifyResponse.text())
      return NextResponse.json(
        { error: '결제 검증에 실패했습니다.' },
        { status: 500 }
      )
    }

    const verifyData = await verifyResponse.json()
    console.log('결제 검증 결과:', verifyData)

    if (verifyData.code !== 0) {
      return NextResponse.json(
        { error: '결제 검증에 실패했습니다.' },
        { status: 400 }
      )
    }

    const payment = verifyData.response

    // 2. 주문 정보 조회
    const orderRef = adminDb.collection('orders').doc(orderId)
    const orderSnapshot = await orderRef.get()

    if (!orderSnapshot.exists) {
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const orderData = orderSnapshot.data()
    console.log('주문 정보:', orderData)

    // 3. 결제 정보 배열 처리
    let paymentInfoArray = []
    let paymentIdArray = []

    if (orderData?.paymentInfo) {
      paymentInfoArray = Array.isArray(orderData.paymentInfo)
        ? [...orderData.paymentInfo]
        : [orderData.paymentInfo]
    }

    if (orderData?.paymentId) {
      paymentIdArray = Array.isArray(orderData.paymentId)
        ? [...orderData.paymentId]
        : [orderData.paymentId]
    }

    // 결제 정보 추가
    const normalizedPayment = {
      ...payment,
      status: payment.status?.toLowerCase(),
    }
    paymentInfoArray.push(normalizedPayment)
    paymentIdArray.push(imp_uid)

    // 4. items 배열에 paymentId 추가
    const existingItems = orderData?.items || []
    const currentPaymentId = paymentIdArray[paymentIdArray.length - 1]
    const itemsWithPaymentId = existingItems.map((item: any) => ({
      ...item,
      ...(currentPaymentId && { paymentId: currentPaymentId }),
      isAddItem: false,
    }))

    // 5. 주문 정보 업데이트
    await orderRef.update({
      paymentStatus: 'paid',
      paymentInfo: paymentInfoArray,
      paymentId: paymentIdArray,
      items: itemsWithPaymentId,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date(),
    })

    console.log('✅ 주문 업데이트 완료')

    // 6. 포인트 사용 처리 (주문에 포인트 사용 정보가 있는 경우)
    if (orderData?.usedPoint && orderData.usedPoint > 0 && orderData.uid) {
      try {
        const userRef = adminDb.collection('users').doc(orderData.uid)
        await userRef.update({
          point: FieldValue.increment(-orderData.usedPoint),
        })

        await adminDb.collection('points').add({
          uid: orderData.uid,
          amount: -orderData.usedPoint,
          type: 'used',
          reason: '주문 결제 시 포인트 사용',
          orderId: orderId,
          productId: orderData.productId || '',
          productName: orderData.productName || '',
          createdAt: FieldValue.serverTimestamp(),
        })

        console.log('✅ 포인트 사용 처리 완료')
      } catch (pointError) {
        console.error('포인트 사용 처리 실패:', pointError)
      }
    }

    // 7. 알림톡 발송
    try {
      // 가게 정보 가져오기
      const storeRef = adminDb.collection('stores').doc(orderData.storeId)
      const storeSnapshot = await storeRef.get()
      const storeData = storeSnapshot.data()

      // 알림톡 API 호출
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/alimtalk/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partnerPhone: storeData?.phone,
          customerPhone: orderData.phone,
          isAdditionalOrder: false,
          storeName: orderData.storeName || '',
          orderNumber: orderData.orderNumber,
          totalQuantity: orderData.totalQuantity,
          totalProductPrice: orderData.totalProductPrice,
          additionalQuantity: 0,
          additionalProductPrice: 0,
        }),
      })

      console.log('✅ 알림톡 발송 완료')
    } catch (alimtalkError) {
      console.error('알림톡 발송 실패:', alimtalkError)
    }

    return NextResponse.json({
      success: true,
      orderNumber: orderData.orderNumber,
      message: '결제가 완료되었습니다.',
    })
  } catch (error) {
    console.error('결제 완료 처리 실패:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
