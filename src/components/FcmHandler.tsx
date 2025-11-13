'use client'

import { useEffect } from 'react'
import { getMessaging, onMessage } from 'firebase/messaging'
import { setupTokenRefreshListener } from '@/lib/fcmToken'
import { useAuth } from '@/contexts/AuthContext'

/**
 * FCM 포그라운드 메시지 핸들러
 *
 * 앱이 열려있을 때(foreground) 수신되는 FCM 푸시 알림을 처리합니다.
 * 서비스 워커는 백그라운드 메시지만 처리하므로, 포그라운드 메시지는 별도로 처리해야 합니다.
 */
export default function FcmHandler() {
  const { user } = useAuth()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const setupForegroundMessaging = async () => {
      try {
        // Firebase Messaging 지원 여부 확인
        const { isSupported } = await import('firebase/messaging')
        const supported = await isSupported()

        if (!supported) {
          console.log('[FCM Handler] Firebase Messaging is not supported')
          return
        }

        const messaging = getMessaging()

        // 포그라운드 메시지 수신 핸들러
        const unsubscribe = onMessage(messaging, (payload) => {
          console.log('[FCM Handler] Foreground message received:', payload)

          // 현재 URL 확인
          const currentUrl = window.location.pathname + window.location.search
          const roomId = payload.data?.roomId

          // 채팅방 안에 있고, 알림이 해당 채팅방에 대한 것이면 알림 표시하지 않음
          if (roomId && currentUrl.includes(`/chat`) && currentUrl.includes(`roomId=${roomId}`)) {
            console.log('[FCM Handler] User is in the chat room, skipping notification')
            return
          }

          const notificationTitle = payload.notification?.title || '새 알림'
          const notificationOptions: NotificationOptions = {
            body: payload.notification?.body || '',
            icon: '/icons/danmo-pick.png',
            badge: '/icons/danmo-pick.png',
            tag: payload.data?.roomId || 'default',
            data: payload.data,
            requireInteraction: false, // 사용자가 수동으로 닫을 때까지 유지하지 않음
          }

          // 브라우저 알림 표시
          if (Notification.permission === 'granted') {
            const notification = new Notification(notificationTitle, notificationOptions)

            // 알림 클릭 이벤트
            notification.onclick = (event) => {
              event.preventDefault()
              notification.close()

              // roomId가 있으면 채팅방으로 이동
              if (roomId) {
                window.location.href = `/chat?roomId=${roomId}`
              } else {
                window.focus()
              }
            }
          }
        })

        console.log('[FCM Handler] Foreground message handler registered')

        return unsubscribe
      } catch (error) {
        console.error('[FCM Handler] Error setting up foreground messaging:', error)
      }
    }

    setupForegroundMessaging()
  }, [])

  // 네이티브 앱에서 전달된 FCM 토큰 처리
  useEffect(() => {
    if (!user) return

    const checkNativeToken = async () => {
      // window.nativeFcmToken이 설정되었는지 확인
      const checkInterval = setInterval(async () => {
        // @ts-expect-error - nativeFcmToken은 React Native 앱에서 주입됨
        if (window.nativeFcmToken) {
          // @ts-expect-error
          const nativeToken = window.nativeFcmToken as string
          console.log('[FCM Handler] Native FCM token received from app:', nativeToken.substring(0, 30) + '...')

          try {
            // Firestore에 네이티브 앱 토큰 저장
            const response = await fetch('/api/update-fcm-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.uid,
                fcmToken: nativeToken,
              }),
            })

            console.log('[FCM Handler] API response status:', response.status)

            if (response.ok) {
              console.log('[FCM Handler] ==========================================')
              console.log('[FCM Handler] Native FCM token saved to Firestore successfully!')
              console.log('[FCM Handler] User ID:', user.uid)
              console.log('[FCM Handler] Token:', nativeToken.substring(0, 30) + '...')
              console.log('[FCM Handler] ==========================================')
            } else {
              const errorText = await response.text()
              console.error('[FCM Handler] ==========================================')
              console.error('[FCM Handler] Failed to save native FCM token')
              console.error('[FCM Handler] Status:', response.status)
              console.error('[FCM Handler] Error:', errorText)
              console.error('[FCM Handler] ==========================================')
            }
          } catch (error) {
            console.error('[FCM Handler] ==========================================')
            console.error('[FCM Handler] Error saving native FCM token:', error)
            console.error('[FCM Handler] ==========================================')
          }

          clearInterval(checkInterval)
        }
      }, 500) // 500ms마다 체크

      // 10초 후에는 체크 중단
      setTimeout(() => {
        clearInterval(checkInterval)
      }, 10000)
    }

    checkNativeToken()
  }, [user])

  // FCM 토큰 자동 갱신 리스너 설정 (네이티브 앱에서는 비활성화)
  useEffect(() => {
    if (!user) return

    // 네이티브 앱에서는 웹 FCM 토큰을 생성하지 않음
    // @ts-expect-error - nativeFcmToken은 React Native 앱에서 주입됨
    if (window.nativeFcmToken !== undefined) {
      console.log('[FCM Handler] Native app detected, skipping web FCM token setup')
      return
    }

    const setupTokenRefresh = async () => {
      try {
        // 토큰 갱신 시 Firestore에 자동 업데이트
        const unsubscribe = await setupTokenRefreshListener(async (newToken) => {
          console.log('[FCM Handler] Token refreshed, updating Firestore...')

          try {
            // Firestore 업데이트 API 호출
            const response = await fetch('/api/update-fcm-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.uid,
                fcmToken: newToken,
              }),
            })

            if (response.ok) {
              console.log('[FCM Handler] FCM token updated in Firestore')
            } else {
              console.error('[FCM Handler] Failed to update FCM token in Firestore')
            }
          } catch (error) {
            console.error('[FCM Handler] Error updating FCM token:', error)
          }
        })

        if (unsubscribe) {
          console.log('[FCM Handler] Token refresh listener registered')
          return unsubscribe
        }
      } catch (error) {
        console.error('[FCM Handler] Error setting up token refresh:', error)
      }
    }

    setupTokenRefresh()
  }, [user])

  return null
}
