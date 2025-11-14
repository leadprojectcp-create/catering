# Firestore Timestamp 변환 스크립트

Firestore의 모든 Timestamp 필드를 ISO 8601 형식으로 변환하는 스크립트입니다.

## 사전 준비

1. **Firebase Admin SDK 설치**
   ```bash
   npm install firebase-admin
   ```

2. **서비스 계정 키 파일 준비**
   - Firebase Console → 프로젝트 설정 → 서비스 계정
   - "새 비공개 키 생성" 클릭
   - 다운로드한 JSON 파일을 프로젝트 루트에 `serviceAccountKey.json`으로 저장

## 실행 방법

```bash
node scripts/convertTimestampsToISO.js
```

## 변환 대상

### 컬렉션
- stores
- products
- orders
- users
- partners
- banners
- notices
- partnerNotices
- settlements
- chats
- messages
- reviews
- likes
- categories

### Timestamp 필드
- createdAt
- updatedAt
- timestamp
- orderDate
- deliveryDate
- settlementDate
- publishedAt
- lastMessageAt
- readAt
- sentAt

## 변환 예시

**변환 전:**
```json
{
  "createdAt": {
    "_seconds": 1761403058,
    "_nanoseconds": 584000000
  }
}
```

**변환 후:**
```json
{
  "createdAt": "2025-12-25T10:30:58.584Z"
}
```

## 주의사항

⚠️ **백업 필수**: 스크립트 실행 전 반드시 데이터베이스 백업을 생성하세요!

```bash
# Firestore 백업 (Firebase Console 또는 gcloud 사용)
gcloud firestore export gs://[BUCKET_NAME]/backups/$(date +%Y%m%d)
```

## 안전 기능

- ✅ 배치 처리 (500개씩)
- ✅ 변경사항이 있는 문서만 업데이트
- ✅ 에러 발생 시 해당 문서만 건너뛰고 계속 진행
- ✅ 상세한 로그 출력
- ✅ 중첩된 객체 및 배열 내부까지 재귀 처리

## 트러블슈팅

### "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### "Cannot find module '../serviceAccountKey.json'"
Firebase Console에서 서비스 계정 키를 다운로드하여 프로젝트 루트에 배치하세요.

### 권한 오류
서비스 계정에 Firestore 읽기/쓰기 권한이 있는지 확인하세요.
