import Image, { ImageProps } from 'next/image'

interface OptimizedImageProps extends Omit<ImageProps, 'quality'> {
  quality?: number
}

// sizes prop에서 최대 width 추출
function extractMaxWidthFromSizes(sizes?: string): number | undefined {
  if (!sizes) return undefined
  const parts = sizes.split(',').map((s) => s.trim())
  const defaultSize = parts[parts.length - 1]
  const match = defaultSize.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : undefined
}

// Bunny CDN 이미지 최적화
function optimizeBunnyCDN(
  src: string,
  targetWidth?: number,
  targetHeight?: number,
  quality?: number
): string {
  if (typeof src !== 'string' || !src.includes('b-cdn.net')) {
    return src
  }

  const url = new URL(src)

  if (targetWidth) {
    url.searchParams.set('width', targetWidth.toString())
  }

  if (targetHeight) {
    url.searchParams.set('height', targetHeight.toString())
  }

  // 정사각형인 경우 aspect_ratio 설정으로 크롭
  if (targetWidth && targetHeight && targetWidth === targetHeight) {
    url.searchParams.set('aspect_ratio', '1:1')
  }

  url.searchParams.set('format', 'webp')
  url.searchParams.set('quality', (quality || 75).toString())
  url.searchParams.set('optimizer', 'true') // BunnyCDN 최적화 활성화

  return url.toString()
}

export default function OptimizedImage({
  quality = 85,
  src,
  width,
  height,
  fill,
  sizes,
  ...props
}: OptimizedImageProps) {
  // width 결정
  let targetWidth = typeof width === 'number' ? width : undefined
  let targetHeight = typeof height === 'number' ? height : undefined

  if (fill && sizes && !targetWidth) {
    targetWidth = extractMaxWidthFromSizes(sizes)
    // 정사각형 이미지의 경우 (예: 제휴업체 130px, 260px, 346px, 390px)
    if (targetWidth && (targetWidth === 130 || targetWidth === 260 || targetWidth === 346 || targetWidth === 390)) {
      targetHeight = targetWidth
    }
    // aspect-ratio 16:5인 배너의 경우 (예: 640px)
    else if (targetWidth === 640) {
      targetHeight = Math.round(targetWidth * (5 / 16))
    }
    // 기타 경우 정사각형으로 처리
    else if (targetWidth) {
      targetHeight = targetWidth
    }
  }

  // Bunny CDN 최적화 URL 생성
  const optimizedSrc = optimizeBunnyCDN(
    typeof src === 'string' ? src : '',
    targetWidth,
    targetHeight,
    quality
  )

  return (
    <Image
      src={optimizedSrc}
      width={width}
      height={height}
      fill={fill}
      sizes={sizes}
      {...props}
    />
  )
}
