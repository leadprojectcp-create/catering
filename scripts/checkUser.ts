import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Settings } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log('Project ID:', projectId);
console.log('Client Email:', clientEmail);
console.log('Private Key 존재:', !!privateKey);

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

// 'catering' 데이터베이스 사용 (firebase.ts와 동일)
const db = getFirestore('catering');
// gRPC 대신 REST 사용
db.settings({ preferRest: true } as Settings);

const auth = getAuth();

async function checkUser() {
  const targetEmail = 'zzugur@nate.com';
  const targetUid = 'Ig0lgcSHISXgeyEDHnmbHQFqeiA2';

  console.log('=== 사용자 검증 시작 ===');
  console.log('검색할 이메일:', targetEmail);
  console.log('알려진 UID:', targetUid);
  console.log('');

  // 1. Firestore에서 해당 UID로 문서 조회
  console.log('--- 1. UID로 Firestore 문서 조회 ---');
  try {
    const userDocByUid = await db.collection('users').doc(targetUid).get();
    if (userDocByUid.exists) {
      console.log('✅ UID로 찾은 문서 존재함');
      console.log('   문서 데이터:', JSON.stringify(userDocByUid.data(), null, 2));
    } else {
      console.log('❌ UID로 찾은 문서 없음');
    }
  } catch (error: any) {
    console.log('❌ UID 조회 에러:', error.message);
  }
  console.log('');

  // 2. Firestore에서 이메일로 문서 조회
  console.log('--- 2. 이메일로 Firestore 문서 조회 ---');
  try {
    const userDocsByEmail = await db.collection('users').where('email', '==', targetEmail).get();
    console.log('이메일로 찾은 문서 수:', userDocsByEmail.size);

    userDocsByEmail.forEach((doc) => {
      console.log('');
      console.log('📄 문서 ID (UID):', doc.id);
      console.log('   이메일:', doc.data().email);
      console.log('   provider:', doc.data().provider);
      console.log('   type:', doc.data().type);
      console.log('   registrationComplete:', doc.data().registrationComplete);

      if (doc.id === targetUid) {
        console.log('   ✅ 이 문서는 알려진 UID와 일치함');
      } else {
        console.log('   ⚠️ 이 문서는 알려진 UID와 다름!');
      }
    });
  } catch (error: any) {
    console.log('❌ 이메일 조회 에러:', error.message);
  }
  console.log('');

  // 3. Firebase Auth에서 이메일로 사용자 조회
  console.log('--- 3. Firebase Auth에서 이메일로 사용자 조회 ---');
  try {
    const authUser = await auth.getUserByEmail(targetEmail);
    console.log('✅ Auth 사용자 발견');
    console.log('   UID:', authUser.uid);
    console.log('   Email:', authUser.email);
    console.log('   Provider:', authUser.providerData.map(p => p.providerId).join(', '));

    if (authUser.uid === targetUid) {
      console.log('   ✅ Auth UID와 알려진 UID 일치');
    } else {
      console.log('   ⚠️ Auth UID와 알려진 UID 다름!');
    }
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log('❌ Auth에서 이메일로 사용자를 찾을 수 없음');
    } else {
      console.log('❌ Auth 조회 에러:', error.message);
    }
  }
  console.log('');

  // 4. Firebase Auth에서 UID로 사용자 조회
  console.log('--- 4. Firebase Auth에서 UID로 사용자 조회 ---');
  try {
    const authUserByUid = await auth.getUser(targetUid);
    console.log('✅ Auth 사용자 발견 (UID로)');
    console.log('   UID:', authUserByUid.uid);
    console.log('   Email:', authUserByUid.email);
    console.log('   Provider:', authUserByUid.providerData.map(p => p.providerId).join(', '));
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log('❌ Auth에서 UID로 사용자를 찾을 수 없음');
    } else {
      console.log('❌ Auth 조회 에러:', error.message);
    }
  }
  console.log('');

  // 5. 모든 Auth 사용자 중 같은 이메일 가진 사용자 찾기
  console.log('--- 5. Auth에서 같은 이메일 가진 모든 사용자 ---');
  try {
    const listResult = await auth.listUsers(1000);
    const matchingUsers = listResult.users.filter(u => u.email === targetEmail);
    console.log('같은 이메일 가진 Auth 사용자 수:', matchingUsers.length);

    matchingUsers.forEach((user) => {
      console.log('');
      console.log('👤 Auth 사용자:');
      console.log('   UID:', user.uid);
      console.log('   Email:', user.email);
      console.log('   Providers:', user.providerData.map(p => `${p.providerId}`).join(', '));
    });
  } catch (error: any) {
    console.log('❌ 사용자 목록 조회 에러:', error.message);
  }

  console.log('');
  console.log('=== 검증 완료 ===');
}

checkUser().catch(console.error);
