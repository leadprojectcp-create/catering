import { NextRequest, NextResponse } from 'next/server'
import { sendOrderNotification } from '@/lib/services/smsService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      partnerPhone,
      customerPhone,
      partnerId,
      customerId,
      isAdditionalOrder,
      storeName,
      orderNumber,
      totalQuantity,
      totalProductPrice,
      additionalQuantity,
      additionalProductPrice,
    } = body

    // 알림 발송
    await sendOrderNotification({
      partnerPhone,
      customerPhone,
      partnerId,
      customerId,
      isAdditionalOrder,
      storeName,
      orderNumber,
      totalQuantity,
      totalProductPrice,
      additionalQuantity,
      additionalProductPrice,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Send Order Notification API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
