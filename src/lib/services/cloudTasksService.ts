// Cloud Tasks 서비스 - REST API 방식
// Google Cloud Tasks REST API를 직접 호출하여 Next.js 번들링 문제 해결

import { GoogleAuth } from 'google-auth-library'

// Cloud Tasks 설정
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'catering-26952'
const LOCATION = process.env.CLOUD_TASKS_LOCATION || 'asia-northeast3'  // 서울 리전
const QUEUE_NAME = process.env.CLOUD_TASKS_QUEUE || 'order-completion-queue'

// API 베이스 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'

// Cloud Tasks REST API 베이스 URL
const CLOUD_TASKS_API_URL = `https://cloudtasks.googleapis.com/v2/projects/${PROJECT_ID}/locations/${LOCATION}/queues/${QUEUE_NAME}`

// Google Auth 클라이언트
let authClient: GoogleAuth | null = null

async function getAuthToken(): Promise<string> {
  if (!authClient) {
    // Firebase Admin SDK 서비스 계정 사용
    const credentials = {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.FIREBASE_PROJECT_ID || PROJECT_ID,
    }

    authClient = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-tasks'],
    })
  }
  const client = await authClient.getClient()
  const token = await client.getAccessToken()
  return token.token || ''
}

/**
 * Cloud Tasks 큐에 작업 생성 (REST API)
 * @param taskName - 고유 작업 이름 (중복 방지)
 * @param url - 호출할 API URL
 * @param payload - POST body
 * @param scheduleTime - 실행 예정 시간
 */
async function createTask(
  taskName: string,
  url: string,
  payload: object,
  scheduleTime: Date
): Promise<string | null> {
  try {
    const token = await getAuthToken()

    const taskPath = `${CLOUD_TASKS_API_URL}/tasks/${taskName}`

    const task = {
      name: `projects/${PROJECT_ID}/locations/${LOCATION}/queues/${QUEUE_NAME}/tasks/${taskName}`,
      httpRequest: {
        httpMethod: 'POST',
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify(payload)).toString('base64'),
      },
      scheduleTime: new Date(scheduleTime).toISOString(),
    }

    const response = await fetch(`${CLOUD_TASKS_API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      // 이미 존재하는 작업인 경우
      if (errorData.error?.code === 409 || errorData.error?.status === 'ALREADY_EXISTS') {
        console.log(`[CloudTasks] 이미 존재하는 작업: ${taskName}`)
        return taskName
      }
      throw new Error(`Cloud Tasks API Error: ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log(`[CloudTasks] 작업 생성 완료: ${result.name}`)
    return result.name || null
  } catch (error: any) {
    console.error('[CloudTasks] 작업 생성 실패:', error)
    throw error
  }
}

/**
 * Cloud Tasks 작업 취소 (삭제)
 * @param taskId - 작업 ID 또는 전체 작업 이름
 */
export async function cancelCloudTask(taskId: string): Promise<boolean> {
  // 로컬 작업인 경우 스킵
  if (taskId.startsWith('local-')) {
    console.log(`[CloudTasks] 로컬 작업, 취소 스킵: ${taskId}`)
    return true
  }

  try {
    const token = await getAuthToken()

    // 전체 경로가 아니면 전체 경로로 변환
    const taskPath = taskId.startsWith('projects/')
      ? taskId
      : `projects/${PROJECT_ID}/locations/${LOCATION}/queues/${QUEUE_NAME}/tasks/${taskId}`

    const response = await fetch(`https://cloudtasks.googleapis.com/v2/${taskPath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      // 이미 삭제되었거나 존재하지 않는 경우
      if (errorData.error?.code === 404 || errorData.error?.status === 'NOT_FOUND') {
        console.log(`[CloudTasks] 이미 삭제되었거나 없는 작업: ${taskId}`)
        return true
      }
      throw new Error(`Cloud Tasks API Error: ${JSON.stringify(errorData)}`)
    }

    console.log(`[CloudTasks] 작업 취소 완료: ${taskId}`)
    return true
  } catch (error: any) {
    console.error('[CloudTasks] 작업 취소 실패:', error)
    return false
  }
}

/**
 * 배송완료 시 구매확정 관련 Cloud Tasks 생성
 * @param orderId - 주문 ID
 * @param deliveryMethod - 배송 방법 ('퀵업체 배송' | '매장 픽업' | '택배 배송')
 * @param deliveryDate - 예약 배송일 (YYYY-MM-DD 형식)
 * @param deliveryTime - 예약 배송시간 (HH:MM 형식, 선택)
 */
export async function createOrderCompletionTasks(
  orderId: string,
  deliveryMethod: string,
  deliveryDate: string,
  deliveryTime?: string
): Promise<{
  notificationTaskId: string | null
  autoCompleteTaskId: string | null
}> {
  const now = new Date()

  // 1. 알림 발송 시간 계산
  // - 매장픽업/퀵: 1시간 후
  // - 택배: 24시간 후
  let notificationDelay: number
  if (deliveryMethod === '택배 배송') {
    notificationDelay = 24 * 60 * 60 * 1000  // 24시간
  } else {
    notificationDelay = 1 * 60 * 60 * 1000  // 1시간
  }
  // 테스트용 (필요시 주석 해제)
  // notificationDelay = 10 * 1000  // 테스트용: 10초
  const notificationTime = new Date(now.getTime() + notificationDelay)

  // 2. 자동완료 시간 계산
  // - 예약일시 + 3일
  const reservationDate = new Date(deliveryDate)
  if (deliveryTime) {
    const [hours, minutes] = deliveryTime.split(':').map(Number)
    reservationDate.setHours(hours, minutes, 0, 0)
  } else {
    reservationDate.setHours(23, 59, 59, 999)  // 예약일 끝
  }
  const autoCompleteTime = new Date(reservationDate.getTime() + 3 * 24 * 60 * 60 * 1000)  // +3일
  // 테스트용 (필요시 주석 해제)
  // const autoCompleteTime = new Date(now.getTime() + 15 * 1000)  // 테스트용: 15초

  console.log(`[CloudTasks] 주문 ${orderId} 스케줄링:`)
  console.log(`  - 알림 발송: ${notificationTime.toISOString()}`)
  console.log(`  - 자동완료: ${autoCompleteTime.toISOString()}`)

  let notificationTaskId: string | null = null
  let autoCompleteTaskId: string | null = null

  // 고유한 Task 이름을 위해 타임스탬프 추가
  const timestamp = Date.now()

  try {
    // 알림 발송 작업 생성
    notificationTaskId = await createTask(
      `order-notification-${orderId}-${timestamp}`,
      `${API_BASE_URL}/api/orders/send-confirmation-reminder`,
      { orderId },
      notificationTime
    )

    // 자동완료 작업 생성
    autoCompleteTaskId = await createTask(
      `order-autocomplete-${orderId}-${timestamp}`,
      `${API_BASE_URL}/api/orders/auto-complete`,
      { orderId },
      autoCompleteTime
    )

    return { notificationTaskId, autoCompleteTaskId }
  } catch (error) {
    console.error('[CloudTasks] 작업 생성 중 오류:', error)

    // 부분 실패 시 생성된 작업 취소
    if (notificationTaskId) {
      await cancelCloudTask(notificationTaskId)
    }

    throw error
  }
}

/**
 * 개발/테스트 환경에서 사용할 수 있는 간단한 스케줄링 (로그 출력만)
 * Cloud Tasks를 사용하지 않는 환경에서 테스트용
 */
export async function createOrderCompletionTasksLocal(
  orderId: string,
  deliveryMethod: string,
  deliveryDate: string,
  deliveryTime?: string
): Promise<{
  notificationTaskId: string | null
  autoCompleteTaskId: string | null
}> {
  const now = new Date()

  // 알림 발송 시간 계산
  let notificationDelay: number
  if (deliveryMethod === '택배 배송') {
    notificationDelay = 24 * 60 * 60 * 1000  // 24시간
  } else {
    notificationDelay = 1 * 60 * 60 * 1000  // 1시간
  }
  const notificationTime = new Date(now.getTime() + notificationDelay)

  // 자동완료 시간 계산
  const reservationDate = new Date(deliveryDate)
  if (deliveryTime) {
    const [hours, minutes] = deliveryTime.split(':').map(Number)
    reservationDate.setHours(hours, minutes, 0, 0)
  } else {
    reservationDate.setHours(23, 59, 59, 999)
  }
  const autoCompleteTime = new Date(reservationDate.getTime() + 3 * 24 * 60 * 60 * 1000)

  console.log(`[LocalScheduler] 주문 ${orderId} 스케줄링 (로그만 출력):`)
  console.log(`  - 알림 발송 예정: ${notificationTime.toISOString()}`)
  console.log(`  - 자동완료 예정: ${autoCompleteTime.toISOString()}`)
  console.log('[LocalScheduler] 로컬 환경에서는 실제 스케줄링이 수행되지 않습니다.')

  return {
    notificationTaskId: `local-notification-${orderId}`,
    autoCompleteTaskId: `local-autocomplete-${orderId}`
  }
}

/**
 * 환경에 따라 적절한 스케줄링 함수 선택
 */
export async function scheduleOrderCompletionTasks(
  orderId: string,
  deliveryMethod: string,
  deliveryDate: string,
  deliveryTime?: string
): Promise<{
  notificationTaskId: string | null
  autoCompleteTaskId: string | null
}> {
  // USE_CLOUD_TASKS 환경 변수가 true인 경우에만 Cloud Tasks 시도
  if (process.env.USE_CLOUD_TASKS === 'true') {
    try {
      return await createOrderCompletionTasks(orderId, deliveryMethod, deliveryDate, deliveryTime)
    } catch (error) {
      console.error('[CloudTasks] Cloud Tasks 생성 실패, 로컬 스케줄러로 대체:', error)
    }
  }

  // Cloud Tasks를 사용하지 않거나 실패한 경우 로컬 스케줄러 사용
  return createOrderCompletionTasksLocal(orderId, deliveryMethod, deliveryDate, deliveryTime)
}
