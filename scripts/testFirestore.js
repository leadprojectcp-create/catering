require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

console.log('🔍 Firebase 연결 테스트\n');

console.log('환경 변수:');
console.log('- PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('- CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('- DATABASE_URL:', process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
console.log('- PRIVATE_KEY 존재:', !!process.env.FIREBASE_PRIVATE_KEY);
console.log('');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  });

  console.log('✅ Firebase Admin 초기화 성공\n');

  const db = admin.firestore();

  console.log('Firestore 연결 테스트 중...\n');

  // stores 컬렉션에서 1개 문서만 가져와보기
  db.collection('stores').limit(1).get()
    .then(snapshot => {
      console.log('✅ Firestore 연결 성공!');
      console.log(`📄 stores 컬렉션 문서 수: ${snapshot.size}`);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        console.log(`\n첫 번째 문서 ID: ${doc.id}`);
        console.log('문서 데이터 샘플:');
        const data = doc.data();

        // Timestamp 필드 찾기
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && '_seconds' in value && '_nanoseconds' in value) {
            console.log(`  - ${key}: Timestamp { _seconds: ${value._seconds}, _nanoseconds: ${value._nanoseconds} }`);
          } else if (value instanceof admin.firestore.Timestamp) {
            console.log(`  - ${key}: Firestore Timestamp`);
          }
        }
      } else {
        console.log('\n⚠️  stores 컬렉션이 비어있습니다.');
      }

      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Firestore 연결 실패:', error.message);
      console.error('에러 코드:', error.code);
      console.error('전체 에러:', error);
      process.exit(1);
    });

} catch (error) {
  console.error('❌ Firebase 초기화 실패:', error.message);
  process.exit(1);
}
