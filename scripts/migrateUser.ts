import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Settings } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log('Project ID:', projectId);

if (!projectId || !clientEmail || !privateKey) {
  console.error('환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

// 'catering' 데이터베이스 사용
const db = getFirestore('catering');
db.settings({ preferRest: true } as Settings);

async function migrateUser() {
  const oldUid = 'Ig0lgcSHISXgeyEDHnmbHQFqeiA2';
  const newUid = 'EDQL7G2huMPfeK0iCyio3OT5TC33';

  console.log('=== 사용자 마이그레이션 시작 ===');
  console.log('Old UID:', oldUid);
  console.log('New UID:', newUid);
  console.log('');

  // 1. 기존 users 문서 조회
  console.log('--- 1. 기존 users 문서 조회 ---');
  const oldUserDoc = await db.collection('users').doc(oldUid).get();

  if (!oldUserDoc.exists) {
    console.log('❌ 기존 사용자 문서를 찾을 수 없습니다:', oldUid);
    return;
  }

  const userData = oldUserDoc.data();
  console.log('✅ 기존 사용자 발견:', userData?.email);
  console.log('   Type:', userData?.type);
  console.log('');

  // 2. 새 UID로 users 문서 생성
  console.log('--- 2. 새 UID로 users 문서 생성 ---');
  const newUserDoc = await db.collection('users').doc(newUid).get();

  if (newUserDoc.exists) {
    console.log('⚠️ 새 UID 문서가 이미 존재합니다. 업데이트합니다.');
  }

  await db.collection('users').doc(newUid).set({
    ...userData,
    updatedAt: new Date()
  });
  console.log('✅ 새 users 문서 생성/업데이트 완료');
  console.log('');

  // 3. stores 컬렉션 마이그레이션
  console.log('--- 3. stores 컬렉션 마이그레이션 ---');
  const storesSnapshot = await db.collection('stores').where('partnerId', '==', oldUid).get();
  console.log('찾은 stores 문서 수:', storesSnapshot.size);

  for (const storeDoc of storesSnapshot.docs) {
    await db.collection('stores').doc(storeDoc.id).update({ partnerId: newUid });
    console.log('✅ Updated store:', storeDoc.id);
  }
  console.log('');

  // 4. products 컬렉션 마이그레이션
  console.log('--- 4. products 컬렉션 마이그레이션 ---');
  const productsSnapshot = await db.collection('products').where('partnerId', '==', oldUid).get();
  console.log('찾은 products 문서 수:', productsSnapshot.size);

  for (const productDoc of productsSnapshot.docs) {
    await db.collection('products').doc(productDoc.id).update({ partnerId: newUid });
    console.log('✅ Updated product:', productDoc.id);
  }
  console.log('');

  // 5. orders 컬렉션 마이그레이션 (partnerId)
  console.log('--- 5. orders 컬렉션 마이그레이션 (partnerId) ---');
  const ordersPartnerSnapshot = await db.collection('orders').where('partnerId', '==', oldUid).get();
  console.log('찾은 orders (partnerId) 문서 수:', ordersPartnerSnapshot.size);

  for (const orderDoc of ordersPartnerSnapshot.docs) {
    await db.collection('orders').doc(orderDoc.id).update({ partnerId: newUid });
    console.log('✅ Updated order (partnerId):', orderDoc.id);
  }
  console.log('');

  // 6. orders 컬렉션 마이그레이션 (userId - 일반 사용자인 경우)
  console.log('--- 6. orders 컬렉션 마이그레이션 (userId) ---');
  const ordersUserSnapshot = await db.collection('orders').where('userId', '==', oldUid).get();
  console.log('찾은 orders (userId) 문서 수:', ordersUserSnapshot.size);

  for (const orderDoc of ordersUserSnapshot.docs) {
    await db.collection('orders').doc(orderDoc.id).update({ userId: newUid });
    console.log('✅ Updated order (userId):', orderDoc.id);
  }
  console.log('');

  // 7. reviews 컬렉션 마이그레이션
  console.log('--- 7. reviews 컬렉션 마이그레이션 ---');
  const reviewsSnapshot = await db.collection('reviews').where('partnerId', '==', oldUid).get();
  console.log('찾은 reviews 문서 수:', reviewsSnapshot.size);

  for (const reviewDoc of reviewsSnapshot.docs) {
    await db.collection('reviews').doc(reviewDoc.id).update({ partnerId: newUid });
    console.log('✅ Updated review:', reviewDoc.id);
  }
  console.log('');

  // 8. 기존 users 문서 삭제
  console.log('--- 8. 기존 users 문서 삭제 ---');
  await db.collection('users').doc(oldUid).delete();
  console.log('✅ 기존 users 문서 삭제 완료:', oldUid);
  console.log('');

  console.log('=== 마이그레이션 완료 ===');
  console.log('');

  // 검증
  console.log('--- 검증 ---');
  const verifyDoc = await db.collection('users').doc(newUid).get();
  if (verifyDoc.exists) {
    console.log('✅ 새 사용자 문서 확인:', verifyDoc.data()?.email);
  }

  const verifyOld = await db.collection('users').doc(oldUid).get();
  if (!verifyOld.exists) {
    console.log('✅ 기존 사용자 문서 삭제 확인');
  } else {
    console.log('❌ 기존 사용자 문서가 아직 존재합니다!');
  }
}

migrateUser().catch(console.error);
