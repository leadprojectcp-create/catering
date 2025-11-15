/**
 * 두 지점 간의 거리를 계산하는 Haversine 공식
 * @param lat1 첫 번째 위도
 * @param lon1 첫 번째 경도
 * @param lat2 두 번째 위도
 * @param lon2 두 번째 경도
 * @returns 거리 (km 단위)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  console.log('=== 거리 계산 시작 ===');
  console.log('사용자 위치 (lat1, lon1):', lat1, lon1);
  console.log('판매자 위치 (lat2, lon2):', lat2, lon2);

  const R = 6371; // 지구의 반지름 (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  console.log('위도 차이 (dLat):', dLat);
  console.log('경도 차이 (dLon):', dLon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  console.log('계산된 거리 (km):', distance);
  console.log('계산된 거리 (m):', Math.round(distance * 1000));
  console.log('=== 거리 계산 완료 ===\n');

  return distance;
}

/**
 * 각도를 라디안으로 변환
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * 거리를 읽기 좋은 형식으로 변환
 * @param distance 거리 (km)
 * @returns 형식화된 거리 문자열 (1m 단위)
 */
export function formatDistance(distance: number): string {
  const meters = Math.round(distance * 1000);

  if (meters < 1000) {
    return `${meters}m`;
  }

  // 1km 이상일 때도 정확한 m 단위로 표시
  const km = Math.floor(meters / 1000);
  const remainingMeters = meters % 1000;

  if (remainingMeters === 0) {
    return `${km}km`;
  }

  return `${km}km ${remainingMeters}m`;
}

/**
 * 로컬 스토리지에서 사용자 위치 가져오기
 */
export function getUserLocation(): { latitude: number; longitude: number } | null {
  if (typeof window === 'undefined') return null;

  try {
    // 먼저 window.nativeLocation 확인 (앱에서 주입한 위치)
    const windowWithLocation = window as Window & { nativeLocation?: { latitude: number; longitude: number } };
    if (windowWithLocation.nativeLocation) {
      return windowWithLocation.nativeLocation;
    }

    // 로컬 스토리지에서 가져오기
    const stored = localStorage.getItem('userLocation');
    if (!stored) return null;

    const location = JSON.parse(stored);
    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      return location;
    }

    return null;
  } catch (error) {
    console.error('Error getting user location:', error);
    return null;
  }
}
