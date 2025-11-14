require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

console.log('🔍 Firestore 데이터베이스 조회\n');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });

  console.log('✅ Firebase Admin 초기화 성공\n');

  // 기본 Firestore 인스턴스 시도
  console.log('📍 시도 1: 기본 Firestore (default)');
  const db1 = admin.firestore();
  db1.listCollections()
    .then(collections => {
      console.log('✅ 성공! 컬렉션 목록:');
      collections.forEach(collection => {
        console.log(`  - ${collection.id}`);
      });
      process.exit(0);
    })
    .catch(err1 => {
      console.log('❌ 실패:', err1.message);
      console.log('');

      // "catering" 데이터베이스 ID로 시도
      console.log('📍 시도 2: "catering" 데이터베이스 ID');
      try {
        const db2 = admin.firestore('catering');
        db2.listCollections()
          .then(collections => {
            console.log('✅ 성공! 컬렉션 목록:');
            collections.forEach(collection => {
              console.log(`  - ${collection.id}`);
            });
            process.exit(0);
          })
          .catch(err2 => {
            console.log('❌ 실패:', err2.message);
            console.log('');
            console.log('💡 해결 방법:');
            console.log('1. Firebase Console에서 Firestore가 활성화되어 있는지 확인');
            console.log('2. 데이터베이스 ID 확인');
            console.log('3. 서비스 계정 권한 확인');
            process.exit(1);
          });
      } catch (err3) {
        console.log('❌ 실패:', err3.message);
        process.exit(1);
      }
    });

} catch (error) {
  console.error('❌ Firebase 초기화 실패:', error.message);
  process.exit(1);
}
