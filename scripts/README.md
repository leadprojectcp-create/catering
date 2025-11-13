# FCM 관리 스크립트

Firebase Cloud Messaging(FCM) 관련 진단 및 테스트 도구 모음입니다.

## 스크립트 목록

### 1. list_recent_users.js
최근 로그인한 사용자 목록과 FCM 토큰 상태를 확인합니다.

**사용법:**
```bash
node scripts/list_recent_users.js
```

**출력 예시:**
```
===== 최근 로그인한 사용자 목록 =====

1. User ID: 4Vr01La1SSSpnqE6g4qPsP1Xy4u2
   이름: 리프컴퍼니
   이메일: leadproject.cp@gmail.com
   타입: partner
   마지막 로그인: Thu Nov 13 2025 16:06:45 GMT+0900
   FCM 토큰: ✅ 있음 (dzps43UKgYqR5uyXCW7C...)

===== 토큰이 있는 사용자 수 =====
FCM 토큰이 있는 사용자: 2명
```

### 2. test_fcm_notification.js
특정 사용자에게 테스트 FCM 알림을 전송합니다.

**사용법:**
```bash
node scripts/test_fcm_notification.js <userId>
```

**예시:**
```bash
node scripts/test_fcm_notification.js 4Vr01La1SSSpnqE6g4qPsP1Xy4u2
```

**출력 예시:**
```
===== FCM 토큰 확인 =====
✅ 사용자 정보:
  - User ID: 4Vr01La1SSSpnqE6g4qPsP1Xy4u2
  - Email: leadproject.cp@gmail.com
  - Name: 리프컴퍼니
  - FCM Token: dzps43UKgYqR5uyXCW7CN-:APA91bE...

===== 테스트 알림 전송 =====
알림 전송 중...
✅ 알림 전송 성공: projects/catering-26952/messages/xxx
```

**에러 처리:**
- 유효하지 않은 FCM 토큰: 자동으로 Firestore와 Realtime Database에서 삭제
- 토큰 없음: 사용자에게 재로그인 안내 메시지 표시

## 환경 변수

스크립트 실행 전에 다음 환경 변수가 설정되어 있어야 합니다 (`.env.local`에서 자동 로드됨):

- `FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID
- `FIREBASE_CLIENT_EMAIL`: Firebase Admin SDK 클라이언트 이메일
- `FIREBASE_PRIVATE_KEY`: Firebase Admin SDK 비공개 키
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`: Firebase Realtime Database URL

## 문제 해결

### "Firebase Admin이 초기화되지 않았습니다" 에러
환경 변수가 올바르게 설정되어 있는지 확인하세요.

### "사용자를 찾을 수 없습니다" 에러
올바른 User ID를 입력했는지 확인하세요. `list_recent_users.js`로 사용자 목록을 먼저 확인하세요.

### "FCM 토큰이 유효하지 않습니다" 에러
스크립트가 자동으로 유효하지 않은 토큰을 삭제합니다. 사용자에게 재로그인을 요청하세요.

## 참고

- FCM 토큰은 로그인 시 자동으로 생성되어 Firestore의 `users` 컬렉션에 저장됩니다.
- 토큰은 앱 재설치, 데이터 삭제 등으로 인해 만료될 수 있습니다.
- 백그라운드 알림: `public/firebase-messaging-sw.js` (Service Worker)
- 포그라운드 알림: `src/components/FcmHandler.tsx` (React Component)
