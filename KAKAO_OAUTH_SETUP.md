# 카카오 OAuth 설정 가이드

## KOE205 에러 해결

### 문제: "잘못된 요청 (KOE205) 픽투잇 서비스 설정에 오류가 있어, 이용할 수 없습니다."

## 해결 체크리스트

### ✅ 카카오 개발자 콘솔 설정

1. **앱 기본 정보 (필수)**
   - [ ] 앱 이름 설정
   - [ ] 회사명 입력
   - [ ] 앱 아이콘 업로드
   - [ ] 개인정보처리방침 URL 등록
   - [ ] 서비스 약관 URL 등록

2. **플랫폼 설정**
   - [ ] Web 플랫폼 추가
   - [ ] 도메인 등록: `http://localhost:3000` (개발용)
   - [ ] 도메인 등록: 배포 도메인 (운영용)

3. **카카오 로그인 설정**
   - [ ] 카카오 로그인 **활성화**
   - [ ] OpenID Connect **활성화**
   - [ ] Redirect URI 등록:
     ```
     http://localhost:3000/__/auth/handler
     https://yourdomain.com/__/auth/handler
     ```

4. **동의항목 설정 (중요!)**
   - [ ] `openid`: 필수 동의
   - [ ] `account_email`: **필수 동의** ⚠️ 이 부분이 핵심!
   - [ ] `profile_nickname`: 선택 동의

5. **검수 상태 확인**
   - [ ] 동의항목이 승인됨 상태인지 확인
   - [ ] 앱 심사 완료 (필요한 경우)

### ✅ Firebase 설정

1. **Authentication > Sign-in method**
   - [ ] 카카오 **사용 설정됨**
   - [ ] 웹 클라이언트 ID: 카카오 **REST API 키** 입력
   - [ ] 웹 클라이언트 보안 비밀번호: 카카오 **Admin 키** 입력

## 원래 문제 상황
카카오 로그인 시 이메일이 `null`로 나오는 문제가 발생했습니다.

```javascript
// 로그에서 확인된 문제
Kakao user info: {displayName: '.', email: null, uid: 'mJVKuPb9rJfCi3aRHpdg9ZsHLj23'}
```

## 해결 방법

### 1. Firebase Console 설정 확인

1. **Firebase Console > Authentication > Sign-in method**에서 카카오 설정 확인
2. **카카오 앱 키 설정** 확인
3. **카카오 개발자 콘솔**에서 앱 설정 확인

### 2. 카카오 개발자 콘솔 설정 (중요)

카카오 개발자 콘솔(https://developers.kakao.com/)에서:

1. **내 애플리케이션** > 해당 앱 선택
2. **카카오 로그인** > **OpenID Connect** 활성화
3. **카카오 로그인** > **동의항목** 설정:
   - `openid`: 필수 동의
   - `account_email`: 필수 동의 (이 부분이 핵심!)
   - `profile_nickname`: 선택 동의
   - `profile_image`: 선택 동의

4. **플랫폼 설정**에서 **Web** 도메인 등록:
   - 개발: `http://localhost:3000`
   - 배포: 실제 도메인

### 3. Firebase Authentication 설정

Firebase Console에서:
1. **Authentication** > **Sign-in method** > **카카오** 선택
2. **카카오 앱 키**(REST API 키) 입력
3. **카카오 앱 시크릿** 입력 (Admin SDK 키)

### 4. 코드에서 구현한 해결책

```typescript
// 1. 이메일 누락 시 명확한 에러 메시지 제공
if (!userEmail) {
  return {
    success: false,
    error: '카카오 계정에서 이메일 정보를 가져올 수 없습니다. 카카오 계정 설정에서 이메일을 공개로 설정하고 다시 시도해주세요.',
    needsEmailSetup: true
  }
}

// 2. OAuth 스코프 설정 강화
const provider = new OAuthProvider('oidc.kakao')
provider.addScope('openid')
provider.addScope('account_email')  // 이메일 필수
provider.addScope('profile_nickname')
provider.addScope('profile_image')

// 3. 카스텀 파라미터로 동의 재요청
provider.setCustomParameters({
  'prompt': 'consent',
  'access_type': 'offline'
})
```

## 사용자에게 안내할 내용

카카오 로그인 시 이메일 누락 에러가 발생하면:

1. **카카오톡 앱 > 더보기 > 설정 > 개인정보**에서 이메일 공개 설정 확인
2. **카카오계정(account.kakao.com)**에서 이메일 설정 확인
3. 브라우저 쿠키/캐시 삭제 후 재시도
4. 다른 브라우저에서 시도

## 테스트 방법

1. 개발자 도구 콘솔에서 다음 로그 확인:
   ```
   Kakao user info: {email: "user@example.com", ...}
   ```
2. 이메일이 null이 아닌 실제 이메일 주소인지 확인
3. Firestore에 올바르게 저장되는지 확인

## 추가 고려사항

- 카카오 계정의 이메일이 인증되지 않은 경우에도 null이 될 수 있음
- 카카오 개발자 콘솔의 동의항목 설정이 가장 중요함
- Firebase의 카카오 OAuth Provider 설정도 정확해야 함