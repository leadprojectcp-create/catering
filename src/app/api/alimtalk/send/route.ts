import { NextRequest, NextResponse } from 'next/server'
import { sendKakaoAlimtalk } from '@/lib/services/smsService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { phone, templateCode, variables } = await request.json()

    console.log('[Alimtalk API] 알림톡 발송 요청:', {
      phone,
      templateCode,
      variables
    })

    if (!phone || !templateCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const success = await sendKakaoAlimtalk(phone, templateCode, variables)

    console.log('[Alimtalk API] 발송 결과:', success)

    return NextResponse.json({ success })
  } catch (error) {
    console.error('[Alimtalk API] 에러:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
