import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider
} from 'firebase/auth'
import { doc, setDoc, query, where, getDocs, collection, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

interface SignupData {
  email: string
  password: string
  name: string
  companyName?: string
  phone?: string
  type?: 'user' | 'partner'
}

export async function checkExistingUser(email: string) {
  try {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data()
      return {
        exists: true,
        type: userData.type || 'user'
      }
    }

    return { exists: false }
  } catch (error) {
    console.error('Error checking existing user:', error)
    return { exists: false }
  }
}

export async function signupUser(userData: SignupData) {
  try {
    console.log('Starting signup process for:', userData.email)

    // 1. 기존 사용자 체크
    const existingUser = await checkExistingUser(userData.email)
    if (existingUser.exists) {
      const userType = existingUser.type === 'partner' ? '파트너 회원' : '일반 회원'
      return {
        success: false,
        error: `이미 ${userType}으로 가입된 이메일입니다.`,
        existingUserType: existingUser.type
      }
    }

    // 2. Firebase Authentication에 사용자 생성
    console.log('Creating Firebase user...')
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    )

    const firebaseUser = userCredential.user
    console.log('Firebase user created successfully:', firebaseUser.uid)

    // 3. Firestore에 사용자 정보 저장
    console.log('Saving user data to Firestore...')
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      email: userData.email,
      name: userData.name,
      companyName: userData.companyName || '',
      phone: userData.phone || '',
      type: userData.type || 'user',
      level: 1, // 기본 레벨 1 (일반 사용자)
      registrationComplete: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('User data saved to Firestore successfully')
    return { success: true, user: firebaseUser }
  } catch (error: unknown) {
    console.error('Signup error:', error)

    // Firebase 에러 메시지를 한국어로 변환
    const errorMessages = {
      'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
      'auth/weak-password': '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
      'auth/invalid-email': '유효하지 않은 이메일 주소입니다.'
    }

    const errorMessage = errorMessages[(error as { code?: string }).code as keyof typeof errorMessages] || '회원가입 중 오류가 발생했습니다.'

    return { success: false, error: errorMessage }
  }
}

// 소셜 로그인용 사용자 데이터 처리
async function handleSocialUser(firebaseUser: any, provider: string) {
  try {
    // 1. Firebase UID로 기존 사용자 확인
    const userRef = doc(db, 'users', firebaseUser.uid)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      // 기존 사용자 - 로그인 처리
      const userData = userDoc.data()
      await setDoc(userRef, {
        ...userData,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      }, { merge: true })

      return {
        success: true,
        user: firebaseUser,
        isExistingUser: true,
        registrationComplete: userData.registrationComplete || false
      }
    } else {
      // 2. 이메일로 기존 사용자 중복 체크
      const existingUser = await checkExistingUser(firebaseUser.email)
      if (existingUser.exists) {
        const userType = existingUser.type === 'partner' ? '파트너 회원' : '일반 회원'
        return {
          success: false,
          error: `이미 ${userType}으로 가입된 이메일입니다. 이메일 로그인을 사용해주세요.`,
          existingUserType: existingUser.type
        }
      }

      // 3. 신규 사용자 - 기본 정보만 저장하고 추가 가입 플로우로 안내
      console.log('New social user detected, creating incomplete registration')

      await setDoc(userRef, {
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
        provider: provider,
        registrationComplete: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      return {
        success: true,
        user: firebaseUser,
        isExistingUser: false,
        registrationComplete: false
      }
    }
  } catch (error) {
    console.error('Social user handle error:', error)
    return { success: false, error: '사용자 정보 처리 중 오류가 발생했습니다.' }
  }
}

// 구글 로그인 (팝업 방식)
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')

    const result = await signInWithPopup(auth, provider)
    return await handleSocialUser(result.user, 'google')
  } catch (error: any) {
    console.error('Google login error:', error)
    return { success: false, error: '구글 로그인 중 오류가 발생했습니다.' }
  }
}


// 카카오톡 로그인 (팝업 방식)
export async function signInWithKakao() {
  try {
    const provider = new OAuthProvider('oidc.kakao')
    provider.addScope('openid')
    provider.addScope('account_email')
    provider.addScope('profile_nickname')

    const result = await signInWithPopup(auth, provider)
    return await handleSocialUser(result.user, 'kakao')
  } catch (error: any) {
    console.error('Kakao login error:', error)
    return { success: false, error: '카카오톡 로그인 중 오류가 발생했습니다.' }
  }
}

// 리다이렉트 결과 처리 함수
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth)
    if (result) {
      // 리다이렉트로 로그인 성공
      const providerId = result.providerId || ''
      const provider = providerId.includes('google') ? 'google' :
                      providerId.includes('apple') ? 'apple' : 'kakao'
      return await handleSocialUser(result.user, provider)
    }
    return null
  } catch (error: any) {
    console.error('Redirect result error:', error)
    return { success: false, error: '소셜 로그인 중 오류가 발생했습니다.' }
  }
}