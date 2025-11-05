import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { sendKakaoAlimtalk } from '@/lib/services/smsService'
import { requestQuickDelivery } from '@/lib/services/quickDeliveryService'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// PortOne V1 웹훅
export async function POST(request: NextRequest) {
  try {
    // V1 웹훅은 JSON 형태로 데이터를 받음
    const webhookData = await request.json()

    console.log('[Webhook V1] PortOne V1 웹훅 수신:', webhookData)

    const { imp_uid, merchant_uid, status } = webhookData

    // 결제 완료 상태 확인
    if (status !== 'paid') {
      console.log(`[Webhook V1] 결제 상태가 paid가 아님: ${status}`)
      return NextResponse.json({ success: true, message: 'Not a paid status' })
    }

    console.log('[Webhook V1] 결제 완료 이벤트!')
    console.log('[Webhook V1] imp_uid:', imp_uid)
    console.log('[Webhook V1] merchant_uid:', merchant_uid)

    // PortOne V1 액세스 토큰 발급
    const tokenResponse = await fetch('https://api.iamport.kr/users/getToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imp_key: process.env.PORTONE_API_KEY,
        imp_secret: process.env.PORTONE_API_SECRET,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('[Webhook V1] 토큰 발급 실패')
      return NextResponse.json({ error: 'Token generation failed' }, { status: 500 })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.response.access_token

    // 결제 정보 검증
    const paymentResponse = await fetch(
      `https://api.iamport.kr/payments/${encodeURIComponent(imp_uid)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!paymentResponse.ok) {
      console.error('[Webhook V1] 결제 검증 실패')
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const paymentData = await paymentResponse.json()
    const payment = paymentData.response

    console.log('[Webhook V1] 결제 검증 완료:', {
      imp_uid: payment.imp_uid,
      status: payment.status,
      amount: payment.amount,
    })

    // merchant_uid에서 orderId 추출
    // 형식: order-{orderId}-{timestamp}
    const orderId = merchant_uid.replace(/^order-/, '').replace(/-\d+$/, '')

    console.log('[Webhook V1] merchant_uid:', merchant_uid)
    console.log('[Webhook V1] Extracted orderId:', orderId)

    // Firestore에서 주문 정보 조회
    if (orderId) {
      const orderRef = doc(db, 'orders', orderId)
      const orderDoc = await getDoc(orderRef)

      if (orderDoc.exists()) {
        const orderData = orderDoc.data()
        const storeId = orderData?.storeId

        console.log(`[Webhook V1] 주문 데이터:`, {
          orderId,
          storeId,
          storeName: orderData?.storeName,
          orderNumber: orderData?.orderNumber,
        })

        if (storeId) {
          // 가게 정보 조회
          const storeRef = doc(db, 'stores', storeId)
          const storeDoc = await getDoc(storeRef)

          if (storeDoc.exists()) {
            const storeData = storeDoc.data()
            const partnerPhone = storeData?.phone

            console.log(`[Webhook V1] 가게 정보:`, {
              storeId,
              partnerPhone,
              storeName: storeData?.storeName,
            })

            if (partnerPhone) {
              // 추가 주문 여부 확인
              const isAdditionalOrder = orderData.paymentInfo && Array.isArray(orderData.paymentInfo) && orderData.paymentInfo.length > 1
              const alreadyNotified = orderData.partnerNotified === true

              // 알림톡 발송
              if (!alreadyNotified || isAdditionalOrder) {
                const totalQuantity = orderData.totalQuantity || orderData.items?.reduce(
                  (sum: number, item: { quantity: number }) => sum + item.quantity,
                  0
                ) || 0
                const totalProductPrice = orderData.totalProductPrice || orderData.totalPrice || 0

                let additionalQuantity = 0
                let additionalProductPrice = 0

                if (isAdditionalOrder && orderData.items) {
                  const additionalItems = orderData.items.filter(
                    (item: { isAddItem?: boolean }) => item.isAddItem === true
                  )

                  additionalQuantity = additionalItems.reduce(
                    (sum: number, item: { quantity: number }) => sum + item.quantity,
                    0
                  )

                  additionalProductPrice = additionalItems.reduce(
                    (sum: number, item: { itemPrice?: number }) => sum + (item.itemPrice || 0),
                    0
                  )
                }

                const alimtalkParams = {
                  storeName: orderData.storeName || '',
                  orderNumber: orderData.orderNumber || orderId,
                  totalQuantity: String(totalQuantity),
                  totalProductPrice: String(totalProductPrice),
                  additionalQuantity: String(additionalQuantity),
                  additionalProductPrice: String(additionalProductPrice),
                }

                const partnerTemplateCode = isAdditionalOrder ? 'UD_3133' : 'UD_0958'
                const customerTemplateCode = isAdditionalOrder ? 'UD_3135' : 'UD_3134'

                try {
                  // 파트너 알림톡
                  console.log(`[Webhook V1] 파트너 알림톡 발송: ${partnerPhone}`)
                  const partnerKakaoSuccess = await sendKakaoAlimtalk(partnerPhone, partnerTemplateCode, alimtalkParams)

                  if (partnerKakaoSuccess && !isAdditionalOrder) {
                    await updateDoc(orderRef, {
                      partnerNotified: true,
                      partnerNotifiedAt: new Date(),
                    })
                  }

                  // 고객 알림톡
                  const customerPhone = orderData.phone
                  if (customerPhone) {
                    console.log(`[Webhook V1] 고객 알림톡 발송: ${customerPhone}`)
                    await sendKakaoAlimtalk(customerPhone, customerTemplateCode, alimtalkParams)
                  }
                } catch (alimtalkError) {
                  console.error('[Webhook V1] 알림톡 발송 실패:', alimtalkError)
                }

                // 퀵배송 요청
                if (orderData.deliveryMethod === '퀵업체 배송' && !orderData.quickDeliveryOrderNo) {
                  try {
                    console.log(`[Webhook V1] 퀵배송 요청 시작`)
                    const quickDeliveryData = {
                      startPhone: orderData.storePhone || '',
                      startAddress: orderData.storeAddress || '',
                      startAddressDetail: orderData.storeAddressDetail || '',
                      destPhone: orderData.phone || '',
                      destAddress: orderData.address || '',
                      destAddressDetail: orderData.addressDetail || '',
                      hddMemo: orderData.requirements || ''
                    }
                    await requestQuickDelivery(quickDeliveryData)
                  } catch (quickError) {
                    console.error('[Webhook V1] 퀵배송 요청 실패:', quickError)
                  }
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Webhook V1] 에러:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
