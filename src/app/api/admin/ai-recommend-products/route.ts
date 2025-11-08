import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import OpenAI from 'openai'

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: '프롬프트를 입력해주세요.' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // 1. Firestore에서 모든 상품 가져오기
    const productsRef = collection(db, 'products')
    const productsSnapshot = await getDocs(productsRef)

    if (productsSnapshot.empty) {
      return NextResponse.json(
        { error: '상품이 없습니다.' },
        { status: 404 }
      )
    }

    // 상품 데이터 변환
    const products = productsSnapshot.docs.map((doc) => {
      const data = doc.data()
      const categoryArray = Array.isArray(data.category)
        ? data.category
        : data.category
        ? [data.category]
        : []

      return {
        id: doc.id,
        name: data.name || '',
        price: data.price || 0,
        category: categoryArray,
        description: data.description || '',
        productTypes: data.productTypes || [],
        imageUrl: data.images?.[0] || '',
      }
    })

    // 2. OpenAI API에 상품 데이터와 프롬프트 전달
    const productListText = products
      .map(
        (p, idx) =>
          `${idx + 1}. ID: ${p.id}\n   이름: ${p.name}\n   가격: ${p.price.toLocaleString()}원\n   카테고리: ${p.category.join(', ')}\n   설명: ${p.description}\n`
      )
      .join('\n')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 비용 효율적인 모델
      messages: [
        {
          role: 'system',
          content:
            '당신은 케이터링 상품 추천 전문가입니다. 사용자의 요구사항에 맞는 상품을 추천해주세요.',
        },
        {
          role: 'user',
          content: `사용자 요구사항: "${prompt}"

아래는 현재 이용 가능한 상품 목록입니다:

${productListText}

위 상품들 중에서 사용자 요구사항에 가장 적합한 상품 5~10개를 추천해주세요.

응답은 반드시 아래 JSON 형식으로만 작성해주세요 (다른 텍스트 없이):
{
  "recommendations": [
    {
      "productId": "상품ID",
      "reason": "추천 이유를 한 문장으로"
    }
  ],
  "summary": "전체 추천 요약 설명"
}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }, // JSON 모드 활성화
    })

    // 3. OpenAI 응답 파싱
    const responseText = completion.choices[0]?.message?.content || ''

    let aiResponse
    try {
      aiResponse = JSON.parse(responseText)
    } catch (parseError) {
      console.error('JSON 파싱 에러:', parseError)
      return NextResponse.json(
        { error: 'AI 응답을 파싱할 수 없습니다.', rawResponse: responseText },
        { status: 500 }
      )
    }

    // 4. 추천된 상품 ID로 실제 상품 데이터 필터링
    const recommendedProductIds = aiResponse.recommendations.map(
      (r: { productId: string; reason: string }) => r.productId
    )
    const recommendedProducts = products
      .filter((p) => recommendedProductIds.includes(p.id))
      .map((p) => {
        const recommendation = aiResponse.recommendations.find(
          (r: { productId: string; reason: string }) => r.productId === p.id
        )
        return {
          ...p,
          recommendationReason: recommendation?.reason || '',
        }
      })

    return NextResponse.json({
      success: true,
      products: recommendedProducts,
      summary: aiResponse.summary,
      totalRecommendations: recommendedProducts.length,
    })
  } catch (error) {
    console.error('AI 상품 추천 에러:', error)
    return NextResponse.json(
      {
        error: 'AI 상품 추천 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
