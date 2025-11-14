/**
 * ISO 8601 형식을 Firestore Timestamp로 변환하는 스크립트
 *
 * 사용법:
 * node scripts/convertTimestampsToISO.js
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
});

// 'catering' 데이터베이스 ID 사용
const db = admin.firestore();
db.settings({
  databaseId: 'catering',
  ignoreUndefinedProperties: true,
});

// 변환할 컬렉션 목록
const COLLECTIONS = [
  'aiRecommendedCategories',
  'banners',
  'faqs',
  'likes',
  'notices',
  'orders',
  'partner_notices',
  'points',
  'popups',
  'products',
  'quickDeliveries',
  'reports',
  'reviews',
  'shoppingCart',
  'stores',
  'taxInvoiceInfo',
  'users'
];

// Timestamp 필드 이름 패턴
const TIMESTAMP_FIELDS = [
  'createdAt',
  'updatedAt',
  'timestamp',
  'orderDate',
  'deliveryDate',
  'settlementDate',
  'publishedAt',
  'lastMessageAt',
  'readAt',
  'sentAt'
];

/**
 * ISO 8601 형식을 체크하는 정규식
 */
const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * 객체 내의 ISO 문자열을 Firestore Timestamp로 변환
 */
function convertTimestampsInObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const converted = { ...obj };

  for (const [key, value] of Object.entries(converted)) {
    // ISO 8601 문자열을 Firestore Timestamp로 변환
    if (typeof value === 'string' && ISO_8601_PATTERN.test(value) && TIMESTAMP_FIELDS.includes(key)) {
      const date = new Date(value);
      converted[key] = admin.firestore.Timestamp.fromDate(date);
      console.log(`  ✓ ${key}: ${value} → Firestore Timestamp`);
    }
    // 중첩된 객체 재귀 처리
    else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof admin.firestore.Timestamp)) {
      converted[key] = convertTimestampsInObject(value);
    }
    // 배열 처리
    else if (Array.isArray(value)) {
      converted[key] = value.map(item =>
        typeof item === 'object' ? convertTimestampsInObject(item) : item
      );
    }
  }

  return converted;
}

/**
 * 컬렉션의 모든 문서를 변환
 */
async function convertCollection(collectionName) {
  console.log(`\n📂 컬렉션: ${collectionName}`);

  try {
    const snapshot = await db.collection(collectionName).limit(1000).get();

    if (snapshot.empty) {
      console.log(`  ℹ️  문서가 없습니다.`);
      return { success: 0, failed: 0, skipped: 0 };
    }

    console.log(`  📄 총 ${snapshot.size}개 문서 처리 중...`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore 배치 제한

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const converted = convertTimestampsInObject(data);

        // 변경사항이 있는지 확인
        const hasChanges = JSON.stringify(data) !== JSON.stringify(converted);

        if (hasChanges) {
          console.log(`\n  📝 문서 ID: ${doc.id}`);
          batch.update(doc.ref, converted);
          batchCount++;
          success++;

          // 배치 크기 제한 확인
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            console.log(`  ✅ ${batchCount}개 문서 커밋 완료`);
            batchCount = 0;
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ❌ 문서 ${doc.id} 처리 실패:`, error.message);
        failed++;
      }
    }

    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  ✅ ${batchCount}개 문서 커밋 완료`);
    }

    console.log(`\n  ✅ 성공: ${success}개`);
    console.log(`  ⏭️  건너뜀: ${skipped}개`);
    if (failed > 0) {
      console.log(`  ❌ 실패: ${failed}개`);
    }

    return { success, failed, skipped };
  } catch (error) {
    console.error(`  ❌ 컬렉션 처리 실패:`, error.message);
    return { success: 0, failed: 0, skipped: 0 };
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 ISO 8601 → Firestore Timestamp 변환 시작');
  console.log(`📍 데이터베이스: catering (asia-northeast3)`);
  console.log(`📋 처리할 컬렉션: ${COLLECTIONS.length}개\n`);

  const totalStats = {
    success: 0,
    failed: 0,
    skipped: 0
  };

  const startTime = Date.now();

  for (const collectionName of COLLECTIONS) {
    const stats = await convertCollection(collectionName);
    totalStats.success += stats.success;
    totalStats.failed += stats.failed;
    totalStats.skipped += stats.skipped;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(50));
  console.log('📊 전체 처리 결과');
  console.log('='.repeat(50));
  console.log(`✅ 성공: ${totalStats.success}개`);
  console.log(`⏭️  건너뜀: ${totalStats.skipped}개`);
  console.log(`❌ 실패: ${totalStats.failed}개`);
  console.log(`⏱️  소요 시간: ${duration}초`);
  console.log('='.repeat(50));

  process.exit(0);
}

// 실행
main().catch(error => {
  console.error('❌ 스크립트 실행 실패:', error);
  process.exit(1);
});
