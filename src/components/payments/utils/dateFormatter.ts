/**
 * 날짜를 한글 형식으로 포맷팅
 * @example "2025-01-15" => "2025년 1월 15일 (수)"
 */
export function formatKoreanDate(dateStr: string): string {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]

  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`
}

/**
 * 시간 포맷팅
 * @example formatTime("14", "30") => "14:30"
 */
export function formatTime(hour: string, minute: string): string {
  return `${hour}:${minute}`
}

/**
 * 시간 문자열 파싱
 * @example "14:30" => { hour: "14", minute: "30" }
 */
export function parseTime(timeStr: string): { hour: string; minute: string } {
  const [hour, minute] = timeStr.split(':')
  return { hour: hour || '00', minute: minute || '00' }
}

/**
 * 날짜가 유효한지 확인
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

/**
 * 오늘 날짜 가져오기 (시간 제거)
 */
export function getToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * N일 후 날짜 계산
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * 두 날짜 사이의 일수 차이 계산
 */
export function getDaysDifference(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay))
}
