import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 이벤트 목록 (types.ts와 동일)
const EVENTS = [
  '회의·업무 행사',
  '교육·세미나·강연',
  '발표·전시·데모',
  '워크숍·프로젝트 일정',
  '팀·조직 모임',
  '학교·학술 행사',
  '종교·단체 모임',
  '커뮤니티·봉사 활동',
  '파티·기념일 행사',
  '오픈·축하·답례 상황',
]

// Gemini API 초기화
function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')
  }
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
}

// 이미지 URL을 base64로 변환
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return {
      data: base64,
      mimeType: contentType.split(';')[0],
    }
  } catch (error) {
    console.error('이미지 다운로드 실패:', imageUrl, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { thumbnailUrl, imageBase64 } = await request.json()

    let imageData: { data: string; mimeType: string } | null = null

    // base64 데이터가 있으면 직접 사용
    if (imageBase64) {
      // data:image/jpeg;base64,... 형식에서 파싱
      const matches = imageBase64.match(/^data:(.+);base64,(.+)$/)
      if (matches) {
        imageData = {
          mimeType: matches[1],
          data: matches[2],
        }
      } else {
        return NextResponse.json(
          { success: false, error: '이미지 형식이 올바르지 않습니다.' },
          { status: 400 }
        )
      }
    } else if (thumbnailUrl) {
      // URL이 있으면 다운로드
      console.log('썸네일 이미지 다운로드 중...', thumbnailUrl)
      imageData = await fetchImageAsBase64(thumbnailUrl)
    }

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: '이미지가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log('AI 분석 중...')

    // Gemini 멀티모달로 이미지 분석
    const model = getGeminiModel()

    const imagePart = {
      inlineData: {
        data: imageData.data,
        mimeType: imageData.mimeType,
      },
    }

    const prompt = `다음은 케이터링/음식 상품의 썸네일 이미지입니다. 이 이미지를 분석하여 이 음식이 어떤 행사/이벤트에 적합한지 추천해주세요.

가능한 이벤트 목록:
${EVENTS.map((e, i) => `${i + 1}. ${e}`).join('\n')}

분석 기준:
- 음식의 종류 (디저트, 샌드위치, 도시락, 케이터링 등)
- 음식의 양과 구성
- 포장/플레이팅 스타일
- 가격대 느낌 (고급스러움, 캐주얼함 등)

응답 형식:
반드시 아래 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력하세요.
{
  "recommendedEvents": ["이벤트1", "이벤트2", ...],
  "reason": "추천 이유를 한 문장으로"
}

추천 이벤트는 위 목록에 있는 이벤트 이름을 정확히 사용해주세요.
최소 1개, 최대 5개까지 추천해주세요.`

    const result = await model.generateContent([prompt, imagePart])
    const response = result.response
    const text = response.text().trim()

    // JSON 파싱
    let analysisResult
    try {
      // JSON 블록 추출 (```json ... ``` 형식 처리)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('JSON 형식을 찾을 수 없습니다.')
      }
    } catch (parseError) {
      console.error('JSON 파싱 실패:', text, parseError)
      return NextResponse.json(
        { success: false, error: 'AI 응답 파싱에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 유효한 이벤트만 필터링
    const validEvents = (analysisResult.recommendedEvents || []).filter((event: string) =>
      EVENTS.includes(event)
    )

    return NextResponse.json({
      success: true,
      recommendedEvents: validEvents,
      reason: analysisResult.reason || '',
    })
  } catch (error: unknown) {
    console.error('상품 분석 실패:', error)
    const errorMessage = error instanceof Error ? error.message : '상품 분석 실패'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
