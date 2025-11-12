// 수수료 설정을 가져오는 유틸리티 함수

export interface CommissionConfig {
  firstOrdersRate: number // 첫 주문 수수료율 (예: 0.03 = 3%)
  firstOrdersCount: number // 첫 주문 수수료 적용 건수 (예: 5)
  standardRate: number // 일반 수수료율 (예: 0.13 = 13%)
}

let cachedConfig: CommissionConfig | null = null

export async function getCommissionConfig(): Promise<CommissionConfig> {
  // 캐시가 있으면 재사용
  if (cachedConfig) {
    return cachedConfig
  }

  try {
    const response = await fetch('/assets/commission.json')
    if (!response.ok) {
      throw new Error('Failed to fetch commission config')
    }
    const config = await response.json() as CommissionConfig
    cachedConfig = config
    return config
  } catch (error) {
    console.error('수수료 설정을 불러오는데 실패했습니다. 기본값을 사용합니다:', error)
    // 기본값 반환
    return {
      firstOrdersRate: 0.03,
      firstOrdersCount: 5,
      standardRate: 0.13
    }
  }
}

/**
 * 주문 번호에 따른 수수료율 계산
 * @param orderIndex 주문 번호 (1부터 시작)
 * @param config 수수료 설정
 * @returns 수수료율 (0~1 사이 값)
 */
export function calculateFeeRate(orderIndex: number, config: CommissionConfig): number {
  return orderIndex <= config.firstOrdersCount ? config.firstOrdersRate : config.standardRate
}
