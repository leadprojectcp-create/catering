import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 외부 서비스를 통해 서버의 공인 IP 확인
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()

    return NextResponse.json({
      serverIp: data.ip,
      headers: {
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
        'x-real-ip': request.headers.get('x-real-ip'),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('IP Check Error:', error)
    return NextResponse.json(
      { error: 'Failed to check IP' },
      { status: 500 }
    )
  }
}
