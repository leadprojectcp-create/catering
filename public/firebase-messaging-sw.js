// Firebase Cloud Messaging Service Worker
// 백그라운드에서 푸시 알림을 받기 위한 서비스 워커

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Firebase 설정
const firebaseConfig = {
  apiKey: 'AIzaSyBmI3Sos-rgkCw1YcEKKBWUQo05a-jyb3Y',
  authDomain: 'catering-26952.firebaseapp.com',
  projectId: 'catering-26952',
  storageBucket: 'catering-26952.firebasestorage.app',
  messagingSenderId: '700559767375',
  appId: '1:700559767375:web:fb972eec1c74adddbe373a',
  measurementId: 'G-8K85YXQB9R',
  databaseURL: 'https://catering-26952-default-rtdb.asia-southeast1.firebasedatabase.app/'
}

// Firebase 초기화
firebase.initializeApp(firebaseConfig)

// Messaging 인스턴스 가져오기
const messaging = firebase.messaging()

// 백그라운드 메시지 핸들러
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)

  const notificationTitle = payload.notification?.title || '새 메시지'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/danmo-pick.png',
    badge: '/icons/danmo-pick.png',
    tag: payload.data?.roomId || 'default',
    data: payload.data
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// 알림 클릭 핸들러
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification)

  event.notification.close()

  const roomId = event.notification.data?.roomId
  const targetUrl = roomId ? `/chat?roomId=${roomId}` : '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      // 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
