import { NextRequest, NextResponse } from 'next/server'
import { sendCancellationNotification, CancellationNotificationParams } from '@/lib/services/smsService'

export async function POST(request: NextRequest) {
  try {
    const params: CancellationNotificationParams = await request.json()

    console.log('[취소 알림 API] 요청:', params)

    await sendCancellationNotification(params)

    return NextResponse.json({
      success: true,
      message: '취소 알림이 발송되었습니다.'
    })
  } catch (error) {
    console.error('[취소 알림 API] Error:', error)
    return NextResponse.json(
      { success: false, error: '취소 알림 발송에 실패했습니다.' },
      { status: 500 }
    )
  }
}
