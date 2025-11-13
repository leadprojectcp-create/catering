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
function optimizeBunnyCDN(src: string, targetWidth?: number, quality?: number): string {
  if (typeof src !== 'string' || !src.includes('b-cdn.net')) {
    return src
  }

  const url = new URL(src)

  if (targetWidth) {
    url.searchParams.set('width', targetWidth.toString())
  }

  url.searchParams.set('format', 'webp')
  url.searchParams.set('quality', (quality || 85).toString())

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

  if (fill && sizes && !targetWidth) {
    targetWidth = extractMaxWidthFromSizes(sizes)
  }

  // Bunny CDN 최적화 URL 생성
  const optimizedSrc = optimizeBunnyCDN(
    typeof src === 'string' ? src : '',
    targetWidth,
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
