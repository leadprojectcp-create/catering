import Image, { ImageProps } from 'next/image'

interface OptimizedImageProps extends Omit<ImageProps, 'quality'> {
  quality?: number
}

export default function OptimizedImage({ quality = 85, ...props }: OptimizedImageProps) {
  return <Image quality={quality} {...props} />
}
