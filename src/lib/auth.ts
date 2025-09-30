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
  password?: string // 소셜 로그인 사용자는 비밀번호가 없을 수 있음
  name: string
  companyName?: string
  phone?: string
  type?: 'user' | 'partner'
  termsAgreements?: Array<{
    type: string
    name: string
    agreed: boolean
    agreedAt: Date | null
  }> | {
    service: boolean
    privacy: boolean
    marketing?: boolean
  }
  // 파트너 추가 정보
  businessCategory?: string
  businessRegistration?: string
  businessOwner?: string
  businessAddress?: {
    city: string
    district: string
    dong: string
    detail: string
    fullAddress: string
  }
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

    // 소셜 로그인 사용자인지 확인 (이미 로그인된 상태)
    const currentUser = auth.currentUser
    let firebaseUser

    if (currentUser && !userData.password) {
      // 소셜 로그인 사용자 - 이미 Firebase Auth에 등록됨
      console.log('Social user detected, skipping Firebase Auth creation')
      firebaseUser = currentUser
    } else if (userData.password) {
      // 일반 회원가입 - Firebase Auth 계정 생성
      console.log('Creating Firebase user...')
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      )
      firebaseUser = userCredential.user
      console.log('Firebase user created successfully:', firebaseUser.uid)
    } else {
      throw new Error('비밀번호가 필요합니다.')
    }

    // 3. Firestore에 사용자 정보 저장
    console.log('Saving user data to Firestore...')
    console.log('Received userData:', userData)
    console.log('Received termsAgreements:', userData.termsAgreements)

    // 약관 동의 정보 처리 - 이미 배열 형태로 전달됨
    const termsArray = userData.termsAgreements || []

    console.log('Constructed termsArray:', termsArray)

    const firestoreUserData = {
      email: userData.email,
      name: userData.name,
      companyName: userData.companyName || '',
      phone: userData.phone || '',
      type: userData.type || 'user',
      level: 1, // 기본 레벨 1 (일반 사용자)
      terms: termsArray,
      registrationComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // 파트너 추가 정보 (파트너인 경우에만)
      ...(userData.type === 'partner' && {
        businessCategory: userData.businessCategory,
        businessRegistration: userData.businessRegistration,
        businessOwner: userData.businessOwner,
        businessAddress: userData.businessAddress
      })
    }

    console.log('Final firestoreUserData to be saved:', firestoreUserData)

    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), firestoreUserData)
      console.log('User data saved to Firestore successfully')
    } catch (firestoreError) {
      console.error('Firestore save error:', firestoreError)
      throw new Error(`Firestore 저장 실패: ${firestoreError}`)
    }
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
async function handleSocialUser(
  firebaseUser: { uid: string; email?: string | null; displayName?: string | null },
  provider: string,
  additionalInfo: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    picture?: string | null
  } = {}
) {
  try {
    // 1. Firebase UID로 기존 사용자 확인
    const userRef = doc(db, 'users', firebaseUser.uid)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      // 기존 사용자 - 로그인 처리
      const userData = userDoc.data()
      const userEmail = additionalInfo.email || firebaseUser.email || userData.email || ''

      await setDoc(userRef, {
        ...userData,
        email: userEmail, // 이메일 확실히 저장
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
      // 2. 이메일 확인
      const userEmail = additionalInfo.email || firebaseUser.email || ''
      if (!userEmail) {
        console.error('Social login: No email available')
        return {
          success: false,
          error: '소셜 계정에서 이메일 정보를 가져올 수 없습니다. 계정 설정을 확인해주세요.',
          needsEmailSetup: true
        }
      }

      // 3. 이메일로 기존 사용자 중복 체크
      const existingUser = await checkExistingUser(userEmail)
      if (existingUser.exists) {
        const userType = existingUser.type === 'partner' ? '파트너 회원' : '일반 회원'
        return {
          success: false,
          error: `이미 ${userType}으로 가입된 이메일입니다. 이메일 로그인을 사용해주세요.`,
          existingUserType: existingUser.type
        }
      }

      // 4. 신규 사용자 - 소셜에서 가져온 정보 + 기본 정보 저장
      console.log('New social user detected, creating incomplete registration')
      console.log('Social user email:', userEmail, 'from additionalInfo:', additionalInfo.email, 'from firebaseUser:', firebaseUser.email)

      const socialUserData = {
        email: additionalInfo.email || firebaseUser.email || userEmail,
        name: additionalInfo.name || firebaseUser.displayName || (additionalInfo.email || firebaseUser.email || userEmail)?.split('@')[0] || '',
        phone: additionalInfo.phone || '',
        provider: provider,
        level: 1, // 기본 레벨 1
        type: '', // 약관 동의 후 선택할 예정
        registrationComplete: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(userRef, socialUserData)

      return {
        success: true,
        user: firebaseUser,
        isExistingUser: false,
        registrationComplete: false,
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
    // 추가 정보를 위한 스코프 (구글에서는 전화번호 직접 제공 안함)
    provider.addScope('https://www.googleapis.com/auth/userinfo.email')
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile')

    const result = await signInWithPopup(auth, provider)

    // 구글에서 가져온 추가 정보 처리
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const token = credential?.accessToken

    // 구글 API에서 추가 정보 가져오기 시도
    let additionalInfo = {
      name: result.user.displayName,
      email: result.user.email, // Firebase에서 제공하는 이메일을 기본값으로
      phone: null
    }

    if (token) {
      try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`)
        if (response.ok) {
          const userInfo = await response.json()
          additionalInfo = {
            name: userInfo.name || result.user.displayName,
            email: userInfo.email || result.user.email, // API 이메일이 없으면 Firebase 이메일 사용
            // 전화번호는 구글에서 직접 제공하지 않으므로 null
            phone: null
          }
        }
      } catch (error) {
        console.warn('Failed to fetch additional Google user info:', error)
        // API 호출 실패 시에도 Firebase 기본 정보 사용
      }
    }

    return await handleSocialUser(result.user, 'google', additionalInfo)
  } catch (error: unknown) {
    console.error('Google login error:', error)
    return { success: false, error: '구글 로그인 중 오류가 발생했습니다.' }
  }
}


// 카카오톡 로그인 (기존 방식)
export async function signInWithKakao() {
  try {
    const provider = new OAuthProvider('oidc.kakao')

    provider.addScope('openid')
    provider.addScope('account_email')
    provider.addScope('profile_nickname')

    provider.setCustomParameters({
      'prompt': 'consent'
    })

    const result = await signInWithPopup(auth, provider)

    console.log('Kakao user info:', {
      displayName: result.user.displayName,
      email: result.user.email,
      uid: result.user.uid,
      providerData: result.user.providerData,
      emailVerified: result.user.emailVerified
    })

    // 추가 디버깅 정보
    console.log('Provider data:', result.user.providerData)
    console.log('Provider data 0:', result.user.providerData[0])
    console.log('Firebase user metadata:', result.user.metadata)

    // Firebase Auth의 user.email이 null이면 providerData에서 이메일 추출
    let userEmail = result.user.email

    if (!userEmail && result.user.providerData.length > 0) {
      userEmail = result.user.providerData[0].email
      console.log('Got email from providerData:', userEmail)
    }

    if (!userEmail) {
      console.error('Kakao login: No email provided')
      return {
        success: false,
        error: '카카오 계정에서 이메일 정보를 가져올 수 없습니다. 카카오 계정 설정에서 이메일을 공개로 설정하고 다시 시도해주세요.',
        needsEmailSetup: true
      }
    }

    const additionalInfo = {
      name: result.user.displayName || userEmail.split('@')[0] || '',
      email: userEmail,
      phone: null
    }

    console.log('Kakao additionalInfo:', additionalInfo)

    return await handleSocialUser(result.user, 'kakao', additionalInfo)
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    console.error('Redirect result error:', error)
    return { success: false, error: '소셜 로그인 중 오류가 발생했습니다.' }
  }
}