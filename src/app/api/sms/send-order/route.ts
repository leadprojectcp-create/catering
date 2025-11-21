import { NextRequest, NextResponse } from 'next/server'
import { sendOrderNotification, OrderNotificationParams } from '@/lib/services/smsService'

export async function POST(request: NextRequest) {
  try {
    const params: OrderNotificationParams = await request.json()

    console.log('[주문 알림 API] 요청:', params)

    await sendOrderNotification(params)

    return NextResponse.json({
      success: true,
      message: '알림이 발송되었습니다.'
    })
  } catch (error) {
    console.error('[주문 알림 API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '알림 발송에 실패했습니다.'
      },
      { status: 500 }
    )
  }
}
