const admin = require('firebase-admin');
const serviceAccount = require('../gcp-service-account.json');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://catering.firebaseio.com`
});

const db = admin.firestore();
// 데이터베이스 위치 설정
db.settings({
  databaseId: 'catering'
});

async function migrateCategoryToArray() {
  try {
    console.log('🔍 products 컬렉션 조회 중...\n');

    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    console.log(`📦 총 ${snapshot.size}개의 상품 발견\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_LIMIT = 500; // Firestore batch 제한

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const category = data.category;

      // category가 문자열인 경우에만 배열로 변환
      if (typeof category === 'string') {
        console.log(`✏️  [${doc.id}] "${data.name}"`);
        console.log(`   변경 전: category = "${category}" (문자열)`);
        console.log(`   변경 후: category = ["${category}"] (배열)\n`);

        batch.update(doc.ref, {
          category: [category]
        });

        updatedCount++;
        batchCount++;

        // 배치가 500개에 도달하면 커밋
        if (batchCount >= BATCH_LIMIT) {
          await batch.commit();
          console.log(`💾 ${batchCount}개 업데이트 커밋 완료\n`);
          batchCount = 0;
        }
      }
      // category가 이미 배열인 경우
      else if (Array.isArray(category)) {
        console.log(`⏭️  [${doc.id}] "${data.name}" - 이미 배열 형태 (건너뜀)`);
        skippedCount++;
      }
      // category가 없거나 다른 타입인 경우
      else {
        console.log(`⚠️  [${doc.id}] "${data.name}" - category 필드가 없거나 유효하지 않음`);
        errorCount++;
      }
    }

    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 마지막 ${batchCount}개 업데이트 커밋 완료\n`);
    }

    console.log('========================================');
    console.log('✅ 마이그레이션 완료!\n');
    console.log(`📊 결과 요약:`);
    console.log(`   - 업데이트됨: ${updatedCount}개`);
    console.log(`   - 건너뜀 (이미 배열): ${skippedCount}개`);
    console.log(`   - 오류/없음: ${errorCount}개`);
    console.log(`   - 총 상품: ${snapshot.size}개`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
console.log('========================================');
console.log('🚀 Category 필드 마이그레이션 시작');
console.log('   위치: asia-northeast3');
console.log('   데이터베이스: catering');
console.log('========================================\n');

migrateCategoryToArray();
