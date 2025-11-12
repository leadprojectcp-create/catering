import Image, { ImageProps } from 'next/image'

interface OptimizedImageProps extends Omit<ImageProps, 'quality'> {
  quality?: number
}

// sizes prop에서 최대 width 추출 (예: "(max-width: 768px) 120px, 195px" -> 195)
function extractMaxWidthFromSizes(sizes?: string): number | undefined {
  if (!sizes) return undefined

  // 콤마로 구분된 sizes를 분리
  const parts = sizes.split(',').map((s) => s.trim())

  // 마지막 값이 기본값 (예: "195px")
  const defaultSize = parts[parts.length - 1]

  // px 값 추출
  const match = defaultSize.match(/(\d+)px/)
  return match ? parseInt(match[1], 10) : undefined
}

// Bunny CDN 이미지 URL에 최적화 파라미터 추가
function optimizeBunnyCDNUrl(src: string, width?: number, height?: number): string {
  // Bunny CDN URL이 아니면 그대로 반환
  if (typeof src !== 'string' || !src.includes('b-cdn.net')) {
    return src
  }

  const url = new URL(src)

  // width가 있으면 추가 (Next.js가 자동으로 계산한 width 사용)
  if (width) {
    url.searchParams.set('width', Math.round(width).toString())
  }

  // height가 있으면 추가
  if (height) {
    url.searchParams.set('height', Math.round(height).toString())
  }

  // WebP 포맷으로 변환 (더 작은 파일 크기)
  url.searchParams.set('format', 'webp')

  // 품질 설정 (80-90이 최적)
  url.searchParams.set('quality', '85')

  return url.toString()
}

export default function OptimizedImage({
  quality = 100,
  src,
  width,
  height,
  fill,
  sizes,
  ...props
}: OptimizedImageProps) {
  // fill 속성을 사용할 때는 sizes에서 width 추출
  let targetWidth = typeof width === 'number' ? width : undefined
  let targetHeight = typeof height === 'number' ? height : undefined

  if (fill && sizes) {
    const maxWidth = extractMaxWidthFromSizes(sizes)
    if (maxWidth) {
      targetWidth = maxWidth
      targetHeight = maxWidth // 정사각형으로 가정
    }
  }

  const optimizedSrc = optimizeBunnyCDNUrl(
    typeof src === 'string' ? src : '',
    targetWidth,
    targetHeight
  )

  return (
    <Image
      quality={quality}
      src={optimizedSrc}
      width={width}
      height={height}
      fill={fill}
      sizes={sizes}
      {...props}
    />
  )
}
