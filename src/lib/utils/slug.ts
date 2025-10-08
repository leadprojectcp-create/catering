// URL 슬러그 생성 함수
export function generateStoreSlug(
  city: string,
  district: string,
  storeName: string,
  category: string,
  uid: string
): string {
  // 특수문자 제거 및 공백을 하이픈으로 변경
  const cleanText = (text: string) => {
    return text
      .trim()
      .replace(/\s+/g, '-') // 공백을 하이픈으로
      .replace(/[^\w가-힣-]/g, '') // 한글, 영문, 숫자, 하이픈만 허용
  }

  const parts = [
    cleanText(city || ''),
    cleanText(district || ''),
    cleanText(storeName || ''),
    cleanText(category || ''),
    uid
  ].filter(Boolean) // 빈 문자열 제거

  return parts.join('-')
}

// 슬러그에서 UID 추출
export function extractUidFromSlug(slug: string): string {
  // 마지막 부분이 uid (하이픈으로 구분된 마지막 항목)
  const parts = slug.split('-')
  return parts[parts.length - 1]
}

// 슬러그 파싱 (디버깅/표시용)
export function parseStoreSlug(slug: string): {
  city?: string
  district?: string
  storeName?: string
  category?: string
  uid: string
} {
  const parts = slug.split('-')
  const uid = parts[parts.length - 1]

  return {
    city: parts[0],
    district: parts[1],
    storeName: parts[2],
    category: parts[3],
    uid
  }
}

// 매거진 슬러그 생성
export function createMagazineSlug(id: string | undefined, title: string | undefined): string {
  if (!id) return ''

  const cleanTitle = (title || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')

  return cleanTitle ? `${id}-${cleanTitle}` : id
}

// 매거진 슬러그에서 ID 추출
export function extractMagazineIdFromSlug(slug: string): string {
  const match = slug.match(/^([^-]+)/)
  return match ? match[1] : slug
}
