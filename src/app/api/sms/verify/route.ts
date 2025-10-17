import { NextRequest, NextResponse } from 'next/server'

// 인증번호 저장소 (send/route.ts와 동일한 저장소 사용)
// 실제로는 Redis나 데이터베이스를 사용해야 하지만, 간단한 구현을 위해 전역 Map 사용
declare global {
  // eslint-disable-next-line no-var
  var verificationStore: Map<string, { code: string; expiresAt: number }> | undefined
}

if (!global.verificationStore) {
  global.verificationStore = new Map()
}

const verificationStore = global.verificationStore

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: '전화번호와 인증번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 전화번호 정규화 (하이픈 제거)
    const normalizedPhone = phone.replace(/-/g, '')

    const stored = verificationStore.get(normalizedPhone)

    if (!stored) {
      return NextResponse.json(
        { success: false, error: '인증번호를 먼저 요청해주세요.' },
        { status: 400 }
      )
    }

    // 만료 확인
    if (Date.now() > stored.expiresAt) {
      verificationStore.delete(normalizedPhone)
      return NextResponse.json(
        { success: false, error: '인증번호가 만료되었습니다. 다시 요청해주세요.' },
        { status: 400 }
      )
    }

    // 인증번호 확인
    if (stored.code !== code) {
      return NextResponse.json(
        { success: false, error: '인증번호가 일치하지 않습니다.' },
        { status: 400 }
      )
    }

    // 인증 성공 - 저장소에서 제거
    verificationStore.delete(normalizedPhone)

    console.log(`[SMS] 인증 성공: ${normalizedPhone}`)

    return NextResponse.json({
      success: true,
      message: '인증이 완료되었습니다.',
    })
  } catch (error) {
    console.error('[SMS Verify API] Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
