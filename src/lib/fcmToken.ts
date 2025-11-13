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
