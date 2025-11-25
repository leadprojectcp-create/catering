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

// Cloudflare R2 CDN 이미지 최적화
// 참고: Cloudflare Images 또는 Polish가 활성화된 경우 자동 최적화됨
// 기본 R2 CDN은 이미지 변환을 지원하지 않으므로 원본 URL 반환
function optimizeCloudflareR2(
  src: string,
  targetWidth?: number,
  targetHeight?: number,
  quality?: number
): string {
  // Cloudflare R2 CDN URL인지 확인
  if (typeof src !== 'string' || !src.includes('danmo-cdn.win')) {
    // 기존 BunnyCDN URL도 지원 (마이그레이션 기간)
    if (typeof src === 'string' && src.includes('b-cdn.net')) {
      return src
    }
    return src
  }

  // Cloudflare R2 기본 CDN은 이미지 변환 파라미터를 지원하지 않음
  // Cloudflare Images 서비스를 사용하는 경우에만 변환 가능
  // 현재는 원본 URL 반환
  return src
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

  // Cloudflare R2 CDN URL 처리
  const optimizedSrc = optimizeCloudflareR2(
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
