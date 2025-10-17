import { NextRequest, NextResponse } from 'next/server'
import { generateVerificationCode, getVerificationMessage, sendSMS } from '@/lib/services/smsService'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

// 인증번호 저장소 (실제로는 Redis 사용 권장)
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
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { success: false, error: '전화번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 전화번호 형식 검증 (010-1234-5678 또는 01012345678)
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { success: false, error: '올바른 전화번호 형식이 아닙니다.' },
        { status: 400 }
      )
    }

    // 전화번호 정규화 (하이픈 제거)
    const normalizedPhone = phone.replace(/-/g, '')

    // 전화번호 중복 체크
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('phone', '==', normalizedPhone))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 전화번호입니다.' },
        { status: 400 }
      )
    }

    // 인증번호 생성
    const code = generateVerificationCode()
    const message = getVerificationMessage(code)

    // SMS 발송
    const sent = await sendSMS(normalizedPhone, message)

    if (!sent) {
      return NextResponse.json(
        { success: false, error: 'SMS 발송에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 인증번호 저장 (5분 유효) - 정규화된 전화번호로 저장
    verificationStore.set(normalizedPhone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5분
    })

    console.log(`[SMS] 인증번호 발송 성공: ${normalizedPhone} -> ${code}`)

    return NextResponse.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
    })
  } catch (error) {
    console.error('[SMS Send API] Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
