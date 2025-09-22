import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('Upload API called')

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    console.log('File received:', file?.name, file?.size)

    if (!file) {
      console.log('No file in request')
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    // 파일명 생성
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const fileName = `meallab/restaurants/${timestamp}_${randomId}.${extension}`

    console.log('Generated filename:', fileName)

    // BunnyCDN 업로드
    const username = process.env.BUNNYCDN_USERNAME
    const password = process.env.BUNNYCDN_PASSWORD
    const hostname = process.env.BUNNYCDN_HOSTNAME

    console.log('BunnyCDN config:', { username, hostname, hasPassword: !!password })

    if (!username || !password || !hostname) {
      console.log('Missing BunnyCDN config')
      return NextResponse.json({ error: 'BunnyCDN 설정이 없습니다.' }, { status: 500 })
    }

    const uploadUrl = `https://${hostname}/${username}/${fileName}`
    console.log('Upload URL:', uploadUrl)

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': password,
      },
      body: Buffer.from(await file.arrayBuffer())
    })

    console.log('Upload response status:', uploadResponse.status, uploadResponse.statusText)

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.log('Upload error response:', errorText)
      throw new Error(`Upload failed: ${uploadResponse.statusText} - ${errorText}`)
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