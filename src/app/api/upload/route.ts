import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cloudflare R2 클라이언트 설정
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

export async function POST(request: NextRequest) {
  console.log('Upload API called')

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const uploadType = formData.get('type') as string || 'store' // 기본값은 store
    const userId = formData.get('userId') as string // 사용자 식별자 (이메일 또는 UID)
    const storeId = formData.get('storeId') as string // 스토어 ID
    const productId = formData.get('productId') as string // 상품 ID
    const reviewId = formData.get('reviewId') as string // 리뷰 ID

    console.log('File received:', file?.name, file?.size, 'Type:', uploadType, 'UserId:', userId, 'StoreId:', storeId, 'ProductId:', productId, 'ReviewId:', reviewId)

    if (!file) {
      console.log('No file in request')
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    // 파일 타입 검증 (이미지 + 동영상)
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const videoTypes = [
      'video/mp4',           // MP4 (가장 범용적)
      'video/quicktime',     // MOV (iPhone/iOS)
      'video/x-msvideo',     // AVI
      'video/webm',          // WebM (웹 표준)
      'video/x-matroska',    // MKV
      'video/3gpp',          // 3GP (Android 구형)
      'video/3gpp2',         // 3G2
      'video/x-m4v'          // M4V (iOS)
    ]
    const validTypes = [...imageTypes, ...videoTypes]

    if (!validTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type)
      return NextResponse.json({
        error: '지원하지 않는 파일 형식입니다. (이미지: JPEG, PNG, GIF, WebP / 동영상: MP4, MOV, AVI, WebM, MKV, 3GP)'
      }, { status: 400 })
    }

    // 파일 크기 검증 (이미지: 10MB, 동영상: 500MB)
    const isVideo = videoTypes.includes(file.type)
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024 // 동영상 500MB, 이미지 10MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size)
      const maxSizeMB = isVideo ? 500 : 10
      return NextResponse.json({
        error: `파일 크기가 너무 큽니다. (${isVideo ? '동영상' : '이미지'} 최대 ${maxSizeMB}MB)`
      }, { status: 400 })
    }

    // 업로드 타입에 따라 폴더 구분
    const folderMap: { [key: string]: string } = {
      'store': 'stores',
      'business-registration': 'business-registrations',
      'menu': 'menus',
      'profile': 'profiles',
      'product': 'products',
      'review': 'reviews',
      'chat': 'chat',
      'faq': 'faqs',
      'notice': 'notices',
      'partnernotice': 'partner-notices',
      'popup': 'popups',
      'banner': 'banners',
      'aicategory': 'aicategories',
      'survey': 'surveys'
    }

    const folder = folderMap[uploadType] || 'others'

    // 파일명 생성
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()

    // 파일 경로 결정
    let fileName: string

    // 채팅 관련 이미지는 날짜별로 저장
    if (uploadType === 'chat') {
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      fileName = `${folder}/${date}/${timestamp}_${randomId}.${extension}`
    }
    // 리뷰 관련 이미지는 reviewId 구조로 저장
    else if (uploadType === 'review' && reviewId) {
      fileName = `${folder}/${reviewId}/${timestamp}_${randomId}.${extension}`
    }
    // 상품 관련 이미지는 storeId/productId 구조로 저장
    else if (uploadType === 'product' && storeId && productId) {
      fileName = `${folder}/${storeId}/${productId}/${timestamp}_${randomId}.${extension}`
    }
    // userId가 있으면 사용자별 폴더에 저장
    else if (userId && uploadType === 'business-registration') {
      fileName = `${folder}/${userId}/${timestamp}_${randomId}.${extension}`
    } else if (userId) {
      fileName = `${folder}/${userId}/${timestamp}_${randomId}.${extension}`
    }
    // 기본 경로
    else {
      fileName = `${folder}/${timestamp}_${randomId}.${extension}`
    }

    console.log('Generated filename:', fileName)

    // Cloudflare R2 설정 확인
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucketName = process.env.R2_BUCKET_NAME
    const cdnDomain = process.env.R2_CDN_DOMAIN // danmo-cdn.win

    console.log('Cloudflare R2 config:', {
      accountId: accountId || 'NOT_SET',
      bucketName: bucketName || 'NOT_SET',
      cdnDomain: cdnDomain || 'NOT_SET',
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      nodeEnv: process.env.NODE_ENV
    })

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.log('Missing Cloudflare R2 config')
      return NextResponse.json({
        error: 'Cloudflare R2 설정이 없습니다.',
        details: {
          accountId: !!accountId,
          accessKeyId: !!accessKeyId,
          secretAccessKey: !!secretAccessKey,
          bucketName: !!bucketName,
          env: process.env.NODE_ENV
        }
      }, { status: 500 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    console.log('File buffer size:', fileBuffer.length)

    // R2에 업로드
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: file.type,
    })

    const uploadResponse = await R2.send(uploadCommand)
    console.log('Upload response:', uploadResponse)

    // CDN URL 반환
    const fileUrl = cdnDomain
      ? `https://${cdnDomain}/${fileName}`
      : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileName}`
    console.log('File URL:', fileUrl)

    return NextResponse.json({
      success: true,
      url: fileUrl
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: `파일 업로드 중 오류가 발생했습니다: ${error}` },
      { status: 500 }
    )
  }
}
