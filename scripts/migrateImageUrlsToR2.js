/**
 * BunnyCDN 이미지 URL을 Cloudflare R2 CDN URL로 마이그레이션하는 스크립트
 *
 * 변환 규칙:
 * https://danmo.b-cdn.net/danmo/... → https://danmo-cdn.win/...
 *
 * 사용법:
 * node scripts/migrateImageUrlsToR2.js
 *
 * 옵션:
 * --dry-run : 실제 업데이트 없이 변경될 내용만 출력
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

// Dry run 모드 확인
const isDryRun = process.argv.includes('--dry-run');

// 변환할 컬렉션 목록
const COLLECTIONS = [
  'aiRecommendedCategories',
  'banners',
  'faqs',
  'magazines',
  'notices',
  'orders',
  'partner_notices',
  'popups',
  'products',
  'reviews',
  'stores',
  'users',
  'chatRooms',
  'surveys'
];

// BunnyCDN URL 패턴
const BUNNY_CDN_PATTERN = /https:\/\/danmo\.b-cdn\.net\/danmo\//g;
const BUNNY_CDN_PATTERN_ALT = /https:\/\/danmo\.b-cdn\.net\//g;

// 새로운 Cloudflare R2 CDN URL
const R2_CDN_BASE = 'https://danmo-cdn.win/';

/**
 * 문자열에서 BunnyCDN URL을 R2 CDN URL로 변환
 */
function convertUrl(url) {
  if (typeof url !== 'string') return url;

  // https://danmo.b-cdn.net/danmo/... → https://danmo-cdn.win/...
  if (url.includes('danmo.b-cdn.net/danmo/')) {
    return url.replace('https://danmo.b-cdn.net/danmo/', R2_CDN_BASE);
  }

  // https://danmo.b-cdn.net/... → https://danmo-cdn.win/...
  if (url.includes('danmo.b-cdn.net/')) {
    return url.replace('https://danmo.b-cdn.net/', R2_CDN_BASE);
  }

  return url;
}

/**
 * 객체 내의 모든 이미지 URL을 재귀적으로 변환
 */
function convertUrlsInObject(obj, path = '') {
  if (!obj || typeof obj !== 'object') return { converted: obj, changes: [] };

  if (Array.isArray(obj)) {
    const changes = [];
    const converted = obj.map((item, index) => {
      if (typeof item === 'string' && item.includes('b-cdn.net')) {
        const newUrl = convertUrl(item);
        if (newUrl !== item) {
          changes.push({ path: `${path}[${index}]`, oldUrl: item, newUrl });
        }
        return newUrl;
      } else if (typeof item === 'object') {
        const result = convertUrlsInObject(item, `${path}[${index}]`);
        changes.push(...result.changes);
        return result.converted;
      }
      return item;
    });
    return { converted, changes };
  }

  const changes = [];
  const converted = { ...obj };

  for (const [key, value] of Object.entries(converted)) {
    const currentPath = path ? `${path}.${key}` : key;

    // 문자열이고 BunnyCDN URL인 경우
    if (typeof value === 'string' && value.includes('b-cdn.net')) {
      const newUrl = convertUrl(value);
      if (newUrl !== value) {
        changes.push({ path: currentPath, oldUrl: value, newUrl });
        converted[key] = newUrl;
      }
    }
    // 배열인 경우
    else if (Array.isArray(value)) {
      const result = convertUrlsInObject(value, currentPath);
      changes.push(...result.changes);
      converted[key] = result.converted;
    }
    // 중첩된 객체인 경우 (Timestamp 제외)
    else if (value && typeof value === 'object' && !(value instanceof admin.firestore.Timestamp)) {
      const result = convertUrlsInObject(value, currentPath);
      changes.push(...result.changes);
      converted[key] = result.converted;
    }
  }

  return { converted, changes };
}

/**
 * 컬렉션의 모든 문서를 변환
 */
async function convertCollection(collectionName) {
  console.log(`\n📂 컬렉션: ${collectionName}`);

  try {
    const snapshot = await db.collection(collectionName).get();

    if (snapshot.empty) {
      console.log(`  ℹ️  문서가 없습니다.`);
      return { success: 0, failed: 0, skipped: 0, totalChanges: 0 };
    }

    console.log(`  📄 총 ${snapshot.size}개 문서 처리 중...`);

    let success = 0;
    let failed = 0;
    let skipped = 0;
    let totalChanges = 0;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const { converted, changes } = convertUrlsInObject(data);

        if (changes.length > 0) {
          console.log(`\n  📝 문서 ID: ${doc.id}`);
          changes.forEach(change => {
            console.log(`    🔄 ${change.path}:`);
            console.log(`       이전: ${change.oldUrl}`);
            console.log(`       이후: ${change.newUrl}`);
          });

          totalChanges += changes.length;

          if (!isDryRun) {
            batch.update(doc.ref, converted);
            batchCount++;

            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              console.log(`  ✅ ${batchCount}개 문서 커밋 완료`);
              batchCount = 0;
            }
          }

          success++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ❌ 문서 ${doc.id} 처리 실패:`, error.message);
        failed++;
      }
    }

    // 남은 배치 커밋
    if (!isDryRun && batchCount > 0) {
      await batch.commit();
      console.log(`  ✅ ${batchCount}개 문서 커밋 완료`);
    }

    console.log(`\n  📊 결과: 변경=${success}개, 건너뜀=${skipped}개, 실패=${failed}개, URL변경=${totalChanges}개`);

    return { success, failed, skipped, totalChanges };
  } catch (error) {
    console.error(`  ❌ 컬렉션 처리 실패:`, error.message);
    return { success: 0, failed: 0, skipped: 0, totalChanges: 0 };
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 BunnyCDN → Cloudflare R2 CDN 이미지 URL 마이그레이션');
  console.log('='.repeat(60));
  console.log(`📍 데이터베이스: catering`);
  console.log(`📋 처리할 컬렉션: ${COLLECTIONS.length}개`);
  console.log(`🔄 변환 규칙:`);
  console.log(`   danmo.b-cdn.net/danmo/... → danmo-cdn.win/...`);
  console.log(`   danmo.b-cdn.net/... → danmo-cdn.win/...`);

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN 모드: 실제 업데이트 없이 변경될 내용만 출력합니다.');
  }

  console.log('='.repeat(60));

  const totalStats = {
    success: 0,
    failed: 0,
    skipped: 0,
    totalChanges: 0
  };

  const startTime = Date.now();

  for (const collectionName of COLLECTIONS) {
    const stats = await convertCollection(collectionName);
    totalStats.success += stats.success;
    totalStats.failed += stats.failed;
    totalStats.skipped += stats.skipped;
    totalStats.totalChanges += stats.totalChanges;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('📊 전체 처리 결과');
  console.log('='.repeat(60));
  console.log(`✅ 변경된 문서: ${totalStats.success}개`);
  console.log(`⏭️  건너뜀: ${totalStats.skipped}개`);
  console.log(`❌ 실패: ${totalStats.failed}개`);
  console.log(`🔗 총 URL 변경: ${totalStats.totalChanges}개`);
  console.log(`⏱️  소요 시간: ${duration}초`);

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN 모드였습니다. 실제로 변경하려면 --dry-run 옵션을 제거하고 다시 실행하세요.');
  }

  console.log('='.repeat(60));

  process.exit(0);
}

// 실행
main().catch(error => {
  console.error('❌ 스크립트 실행 실패:', error);
  process.exit(1);
});
