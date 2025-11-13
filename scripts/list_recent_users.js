// 최근 로그인한 사용자 목록 조회
const admin = require('firebase-admin');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
});

const db = admin.firestore();
db.settings({ databaseId: 'catering' });

async function listRecentUsers() {
  try {
    console.log('===== 최근 로그인한 사용자 목록 =====\n');

    // 최근 로그인 순으로 정렬하여 상위 10명 가져오기
    const usersSnapshot = await db.collection('users')
      .orderBy('lastLoginAt', 'desc')
      .limit(10)
      .get();

    if (usersSnapshot.empty) {
      console.log('사용자가 없습니다.');
      return;
    }

    usersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      const lastLogin = data.lastLoginAt?.toDate?.() || data.lastLoginAt;
      const hasFcmToken = !!data.fcmToken;
      const fcmTokenPreview = data.fcmToken ? `${data.fcmToken.substring(0, 20)}...` : '없음';

      console.log(`${index + 1}. User ID: ${doc.id}`);
      console.log(`   이름: ${data.name || '없음'}`);
      console.log(`   이메일: ${data.email || '없음'}`);
      console.log(`   타입: ${data.type || '미설정'}`);
      console.log(`   마지막 로그인: ${lastLogin || '없음'}`);
      console.log(`   FCM 토큰: ${hasFcmToken ? '✅ 있음' : '❌ 없음'} ${hasFcmToken ? `(${fcmTokenPreview})` : ''}`);
      console.log('');
    });

    console.log('===== 토큰이 있는 사용자 수 =====');
    const usersWithToken = await db.collection('users')
      .where('fcmToken', '!=', null)
      .count()
      .get();
    console.log(`FCM 토큰이 있는 사용자: ${usersWithToken.data().count}명`);

  } catch (error) {
    console.error('에러 발생:', error);
  } finally {
    process.exit(0);
  }
}

listRecentUsers();
