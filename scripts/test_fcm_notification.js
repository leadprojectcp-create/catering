// FCM 토큰 확인 및 테스트 알림 전송 스크립트
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

async function testFcmNotification(userId) {
  try {
    console.log('===== FCM 토큰 확인 =====');

    // 1. Firestore에서 사용자 정보 가져오기
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.log('❌ 사용자를 찾을 수 없습니다:', userId);
      return;
    }

    const userData = userDoc.data();
    console.log('✅ 사용자 정보:');
    console.log('  - User ID:', userId);
    console.log('  - Email:', userData.email);
    console.log('  - Name:', userData.name);
    console.log('  - FCM Token:', userData.fcmToken || '❌ 토큰 없음');

    if (!userData.fcmToken) {
      console.log('\n❌ FCM 토큰이 Firestore에 저장되어 있지 않습니다.');
      console.log('로그인 시 토큰이 생성되었는지 클라이언트 로그를 확인하세요.');
      return;
    }

    console.log('\n===== 테스트 알림 전송 =====');

    // 2. 테스트 알림 전송
    const message = {
      token: userData.fcmToken,
      notification: {
        title: '🔔 테스트 알림',
        body: 'FCM 알림이 정상적으로 작동합니다!'
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    console.log('알림 전송 중...');
    const response = await admin.messaging().send(message);
    console.log('✅ 알림 전송 성공:', response);

  } catch (error) {
    console.error('\n❌ 에러 발생:', error.message);

    // 에러 타입별 처리
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.log('\n💡 FCM 토큰이 유효하지 않습니다.');
      console.log('   - 토큰이 만료되었거나');
      console.log('   - 앱이 재설치되었거나');
      console.log('   - 토큰이 올바르지 않습니다.');
      console.log('\n해결 방법: 앱을 다시 시작하고 로그인하여 새 토큰을 발급받으세요.');

      // Firestore에서 토큰 삭제
      console.log('\n🗑️  Firestore에서 유효하지 않은 토큰 삭제 중...');
      await db.collection('users').doc(userId).update({ fcmToken: null });
      console.log('✅ 토큰 삭제 완료');

    } else if (error.code === 'messaging/invalid-argument') {
      console.log('\n💡 FCM 토큰 형식이 올바르지 않습니다.');
      console.log('   토큰 값을 확인하세요:', userData?.fcmToken);

    } else {
      console.log('\n상세 에러:', error);
    }
  } finally {
    process.exit(0);
  }
}

// 사용자 ID를 인자로 받음
const userId = process.argv[2];
if (!userId) {
  console.log('사용법: node test_fcm_notification.js <userId>');
  console.log('');
  console.log('예시:');
  console.log('  node test_fcm_notification.js abc123def456');
  process.exit(1);
}

testFcmNotification(userId);
