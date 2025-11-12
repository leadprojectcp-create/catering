import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const x = searchParams.get('x')
  const y = searchParams.get('y')

  if (!x || !y) {
    return NextResponse.json({ error: 'x and y parameters are required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${x}&y=${y}`,
      {
        headers: {
          Authorization: `KakaoAK ${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}`
        }
      }
    )

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Kakao API Error:', error)
    return NextResponse.json({ error: 'Failed to convert coordinates' }, { status: 500 })
  }
}
