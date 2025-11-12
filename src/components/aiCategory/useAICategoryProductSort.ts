import { useMemo } from 'react'

export type SortOption = 'recommended' | 'mostReviewed' | 'highestRating' | 'lowestPrice' | 'highestPrice'

export interface SortableProduct {
  id: string
  distance?: number
  reviewCount?: number
  averageRating?: number
  price: number
  discountedPrice?: number
  discount?: {
    discountPercent: number
    startDate?: string | null
    endDate?: string | null
    isAlwaysActive?: boolean
  }
}

/**
 * 상품 정렬을 위한 커스텀 훅
 * @param products - 정렬할 상품 배열
 * @param sortOption - 정렬 옵션 ('recommended' | 'mostReviewed' | 'highestRating' | 'lowestPrice' | 'highestPrice')
 * @returns 정렬된 상품 배열
 */
export function useProductSort<T extends SortableProduct>(
  products: T[],
  sortOption: SortOption
): T[] {
  return useMemo(() => {
    // 원본 배열을 변경하지 않기 위해 복사
    const sortedProducts = [...products]

    switch (sortOption) {
      case 'recommended':
        // 추천순: 거리 기반 정렬 (가까운 순)
        return sortedProducts.sort((a, b) => {
          if (a.distance !== undefined && b.distance === undefined) return -1
          if (a.distance === undefined && b.distance !== undefined) return 1
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance
          }
          return 0
        })

      case 'mostReviewed':
        // 리뷰 많은순
        return sortedProducts.sort((a, b) => {
          const reviewCountA = a.reviewCount || 0
          const reviewCountB = b.reviewCount || 0
          return reviewCountB - reviewCountA
        })

      case 'highestRating':
        // 별점 높은순
        return sortedProducts.sort((a, b) => {
          const ratingA = a.averageRating || 0
          const ratingB = b.averageRating || 0
          if (ratingB !== ratingA) {
            return ratingB - ratingA
          }
          // 별점이 같으면 리뷰 수로 정렬
          return (b.reviewCount || 0) - (a.reviewCount || 0)
        })

      case 'lowestPrice':
        // 낮은 가격순
        return sortedProducts.sort((a, b) => {
          const priceA = getEffectivePrice(a)
          const priceB = getEffectivePrice(b)
          return priceA - priceB
        })

      case 'highestPrice':
        // 높은 가격순
        return sortedProducts.sort((a, b) => {
          const priceA = getEffectivePrice(a)
          const priceB = getEffectivePrice(b)
          return priceB - priceA
        })

      default:
        return sortedProducts
    }
  }, [products, sortOption])
}

/**
 * 상품의 실제 가격을 반환 (할인가가 있으면 할인가, 없으면 정가)
 */
function getEffectivePrice(product: SortableProduct): number {
  // 할인이 유효한지 확인
  if (product.discountedPrice && isDiscountValid(product)) {
    return product.discountedPrice
  }
  return product.price
}

/**
 * 할인이 유효한지 확인
 */
function isDiscountValid(product: SortableProduct): boolean {
  if (!product.discount || !product.discount.discountPercent || product.discount.discountPercent <= 0) {
    return false
  }

  // 상시 적용이거나 기간이 설정되지 않은 경우
  if (!product.discount.startDate || !product.discount.endDate) {
    return true
  }

  const now = new Date()
  const startDate = new Date(product.discount.startDate)
  const endDate = new Date(product.discount.endDate)

  // 현재 시간이 시작일과 종료일 사이에 있는지 체크
  return now >= startDate && now <= endDate
}

/**
 * 정렬 옵션의 한글 라벨
 */
export const SORT_LABELS: Record<SortOption, string> = {
  recommended: '추천순',
  mostReviewed: '리뷰 많은순',
  highestRating: '별점 높은순',
  lowestPrice: '낮은 가격순',
  highestPrice: '높은 가격순',
}

/**
 * 사용 가능한 모든 정렬 옵션
 */
export const SORT_OPTIONS: SortOption[] = [
  'recommended',
  'mostReviewed',
  'highestRating',
  'lowestPrice',
  'highestPrice',
]
