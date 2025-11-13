import { getMessaging, getToken, isSupported } from 'firebase/messaging'

/**
 * 웹 브라우저에서 FCM 토큰을 발급받습니다.
 *
 * 이 함수는:
 * 1. 브라우저 환경에서만 실행됩니다 (서버에서는 null 반환)
 * 2. 사용자에게 알림 권한을 요청합니다
 * 3. FCM 토큰을 발급받아 반환합니다
 * 4. 에러 발생 시 null을 반환합니다
 *
 * @returns FCM 토큰 문자열 또는 null
 */
export async function requestWebFcmToken(): Promise<string | null> {
  try {
    // 서버 사이드 렌더링 환경에서는 실행하지 않음
    if (typeof window === 'undefined') {
      console.log('[Web FCM] Server-side environment, skipping token generation')
      return null
    }

    // FCM이 지원되는지 확인
    const supported = await isSupported()
    if (!supported) {
      console.log('[Web FCM] FCM is not supported in this browser')
      return null
    }

    // 알림 권한 확인
    let permission = Notification.permission
    console.log('[Web FCM] Current notification permission:', permission)

    // 권한이 없으면 요청
    if (permission === 'default') {
      console.log('[Web FCM] Requesting notification permission...')
      permission = await Notification.requestPermission()
      console.log('[Web FCM] Permission result:', permission)
    }

    // 권한이 거부되었으면 null 반환
    if (permission !== 'granted') {
      console.log('[Web FCM] Notification permission denied')
      return null
    }

    // 서비스 워커 등록 확인
    if (!('serviceWorker' in navigator)) {
      console.log('[Web FCM] Service Worker is not supported')
      return null
    }

    // 서비스 워커 등록
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    console.log('[Web FCM] Service Worker registered:', registration.scope)

    // 서비스 워커가 활성화될 때까지 대기
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', (e) => {
          if ((e.target as ServiceWorker).state === 'activated') {
            resolve()
          }
        })
      })
    }

    // Firebase Messaging 인스턴스 가져오기
    const messaging = getMessaging()

    // VAPID 키 (환경변수에서 가져오기, 없으면 기본값 사용)
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

    // FCM 토큰 발급
    console.log('[Web FCM] Requesting FCM token...')
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration
    })

    if (token) {
      console.log('[Web FCM] FCM token generated successfully:', token)
      return token
    } else {
      console.log('[Web FCM] No registration token available')
      return null
    }
  } catch (error) {
    console.error('[Web FCM] Error generating FCM token:', error)

    // 특정 에러 메시지에 대한 추가 정보 제공
    if (error instanceof Error) {
      if (error.message.includes('messaging/permission-blocked')) {
        console.log('[Web FCM] Notification permission is blocked by the user')
      } else if (error.message.includes('messaging/unsupported-browser')) {
        console.log('[Web FCM] This browser does not support FCM')
      } else if (error.message.includes('messaging/failed-service-worker-registration')) {
        console.log('[Web FCM] Service Worker registration failed')
      }
    }

    return null
  }
}

/**
 * FCM 토큰이 이미 저장되어 있는지 확인합니다.
 * localStorage에서 토큰을 가져옵니다.
 *
 * @returns 저장된 FCM 토큰 또는 null
 */
export function getSavedFcmToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem('fcmToken')
  } catch (error) {
    console.error('[Web FCM] Error reading saved token:', error)
    return null
  }
}

/**
 * FCM 토큰을 localStorage에 저장합니다.
 *
 * @param token - 저장할 FCM 토큰
 */
export function saveFcmToken(token: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem('fcmToken', token)
    console.log('[Web FCM] Token saved to localStorage')
  } catch (error) {
    console.error('[Web FCM] Error saving token:', error)
  }
}

/**
 * 저장된 FCM 토큰을 삭제합니다.
 */
export function clearFcmToken(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem('fcmToken')
    console.log('[Web FCM] Token cleared from localStorage')
  } catch (error) {
    console.error('[Web FCM] Error clearing token:', error)
  }
}

/**
 * 주기적으로 FCM 토큰을 확인하고 변경되었으면 갱신합니다.
 * Firebase v9+에서는 Service Worker가 자동으로 토큰을 갱신하므로,
 * 주기적으로 저장된 토큰과 현재 토큰을 비교하여 변경을 감지합니다.
 *
 * @param onTokenRefreshed - 토큰이 갱신되었을 때 호출될 콜백 함수
 * @param intervalMs - 확인 주기 (밀리초, 기본값: 1시간)
 * @returns cleanup 함수
 */
export async function setupTokenRefreshListener(
  onTokenRefreshed?: (newToken: string) => Promise<void>,
  intervalMs: number = 60 * 60 * 1000 // 1시간
): Promise<(() => void) | null> {
  try {
    if (typeof window === 'undefined') {
      return null
    }

    const supported = await isSupported()
    if (!supported) {
      return null
    }

    // 토큰 확인 함수
    const checkTokenRefresh = async () => {
      try {
        const savedToken = getSavedFcmToken()
        if (!savedToken) {
          return
        }

        // 현재 토큰 가져오기 (갱신되었을 수 있음)
        const currentToken = await requestWebFcmToken()

        if (currentToken && currentToken !== savedToken) {
          console.log('[Web FCM] Token has changed, updating...')
          console.log('[Web FCM] Old token:', savedToken.substring(0, 20) + '...')
          console.log('[Web FCM] New token:', currentToken.substring(0, 20) + '...')

          saveFcmToken(currentToken)

          // 콜백 함수 호출 (Firestore 업데이트 등)
          if (onTokenRefreshed) {
            await onTokenRefreshed(currentToken)
          }
        }
      } catch (error) {
        console.error('[Web FCM] Error checking token refresh:', error)
      }
    }

    // 주기적으로 토큰 확인
    const intervalId = setInterval(checkTokenRefresh, intervalMs)
    console.log(`[Web FCM] Token refresh check scheduled every ${intervalMs / 1000 / 60} minutes`)

    // 즉시 한 번 실행
    checkTokenRefresh()

    // cleanup 함수 반환
    return () => {
      clearInterval(intervalId)
      console.log('[Web FCM] Token refresh check stopped')
    }
  } catch (error) {
    console.error('[Web FCM] Error setting up token refresh listener:', error)
    return null
  }
}
