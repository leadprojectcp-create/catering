import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('Upload API called')

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const uploadType = formData.get('type') as string || 'restaurant' // 기본값은 restaurant
    const userId = formData.get('userId') as string // 사용자 식별자 (이메일 또는 UID)

    console.log('File received:', file?.name, file?.size, 'Type:', uploadType, 'UserId:', userId)

    if (!file) {
      console.log('No file in request')
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    // 파일 타입 검증
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type)
      return NextResponse.json({ error: '지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 지원)' }, { status: 400 })
    }

    // 파일 크기 검증 (10MB 제한)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size)
      return NextResponse.json({ error: '파일 크기가 너무 큽니다. (최대 10MB)' }, { status: 400 })
    }

    // 업로드 타입에 따라 폴더 구분
    const folderMap: { [key: string]: string } = {
      'restaurant': 'restaurants',
      'business-registration': 'business-registrations',
      'menu': 'menus',
      'profile': 'profiles'
    }

    const folder = folderMap[uploadType] || 'others'

    // 파일명 생성
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()

    // userId가 있으면 사용자별 폴더에 저장, 없으면 공용 폴더에 저장
    let fileName: string
    if (userId && uploadType === 'business-registration') {
      // 사업자 등록증은 사용자별로 구분
      fileName = `picktoeat/${folder}/${userId}/${timestamp}_${randomId}.${extension}`
    } else if (userId) {
      // 기타 사용자 관련 파일도 사용자별로 구분
      fileName = `picktoeat/${folder}/${userId}/${timestamp}_${randomId}.${extension}`
    } else {
      // userId가 없으면 기존 방식대로
      fileName = `picktoeat/${folder}/${timestamp}_${randomId}.${extension}`
    }

    console.log('Generated filename:', fileName)

    // BunnyCDN 업로드
    const username = process.env.BUNNY_STORAGE_ZONE_NAME
    const password = process.env.BUNNY_STORAGE_PASSWORD
    const hostname = process.env.BUNNY_CDN_HOSTNAME

    console.log('BunnyCDN config:', {
      username: username || 'NOT_SET',
      hostname: hostname || 'NOT_SET',
      hasPassword: !!password,
      nodeEnv: process.env.NODE_ENV
    })

    if (!username || !password || !hostname) {
      console.log('Missing BunnyCDN config - username:', !!username, 'password:', !!password, 'hostname:', !!hostname)
      return NextResponse.json({
        error: 'BunnyCDN 설정이 없습니다.',
        details: {
          username: !!username,
          password: !!password,
          hostname: !!hostname,
          env: process.env.NODE_ENV
        }
      }, { status: 500 })
    }

    const uploadUrl = `https://${hostname}/${username}/${fileName}`
    console.log('Upload URL:', uploadUrl)

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    console.log('File buffer size:', fileBuffer.length)

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': password,
        'Content-Type': file.type,
        'Content-Length': fileBuffer.length.toString(),
      },
      body: fileBuffer
    })

    console.log('Upload response status:', uploadResponse.status, uploadResponse.statusText)

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.log('Upload error response:', errorText)
      console.log('Upload error headers:', Object.fromEntries(uploadResponse.headers.entries()))
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`)
    }

    // BunnyCDN에서 파일에 접근할 수 있는 URL 반환
    const fileUrl = `https://${username}.b-cdn.net/${fileName}`
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