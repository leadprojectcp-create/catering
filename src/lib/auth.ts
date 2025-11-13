import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser
} from 'firebase/auth'
import { doc, setDoc, query, where, getDocs, collection, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { requestWebFcmToken, saveFcmToken } from './fcmToken'

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
  businessRegistrationImage?: string
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

// 일반 로그인 시 FCM 토큰 업데이트
export async function updateFcmToken(userId: string, fcmToken?: string | null) {
  try {
    if (!fcmToken) {
      // 네이티브 앱 환경에서는 웹 FCM 토큰을 생성하지 않음
      // @ts-expect-error - nativeFcmToken은 React Native 앱에서 주입됨
      if (typeof window !== 'undefined' && window.nativeFcmToken !== undefined) {
        console.log('[updateFcmToken] Native app detected, skipping web FCM token generation')
        return
      }

      // 웹 브라우저에서 FCM 토큰 발급 시도
      console.log('[updateFcmToken] No FCM token provided, requesting web FCM token...')
      fcmToken = await requestWebFcmToken()

      if (fcmToken) {
        // localStorage에 저장
        saveFcmToken(fcmToken)
        console.log('[updateFcmToken] Web FCM token generated and saved')
      }
    }

    if (!fcmToken) {
      console.log('[updateFcmToken] No FCM token available')
      return
    }

    const userRef = doc(db, 'users', userId)
    await setDoc(userRef, {
      fcmToken: fcmToken,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    }, { merge: true })

    console.log('[updateFcmToken] FCM token updated for user:', userId)
  } catch (error) {
    console.error('[updateFcmToken] Failed to update FCM token:', error)
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
      // 일반 회원가입 전에 이메일 중복 체크 (소셜 로그인 포함)
      console.log('Checking for existing email...')
      const existingUser = await checkExistingUser(userData.email)
      if (existingUser.exists) {
        const userType = existingUser.type === 'partner' ? '파트너 회원' : '일반 회원'
        return { success: false, error: `이미 ${userType}으로 가입된 이메일입니다.` }
      }

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
      return { success: false, error: '비밀번호가 필요합니다.' }
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
        businessRegistrationImage: userData.businessRegistrationImage,
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
export async function handleSocialUser(
  firebaseUser: { uid: string; email?: string | null; displayName?: string | null },
  provider: string,
  additionalInfo: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    fcmToken?: string | null
  } = {}
) {
  try {
    // FCM 토큰이 없으면 웹에서 발급 시도 (네이티브 앱 제외)
    if (!additionalInfo.fcmToken) {
      // 네이티브 앱 환경에서는 웹 FCM 토큰을 생성하지 않음
      // @ts-expect-error - nativeFcmToken은 React Native 앱에서 주입됨
      if (typeof window !== 'undefined' && window.nativeFcmToken !== undefined) {
        console.log('[handleSocialUser] Native app detected, skipping web FCM token generation')
      } else {
        console.log('[handleSocialUser] No FCM token provided, requesting web FCM token...')
        const webFcmToken = await requestWebFcmToken()
        if (webFcmToken) {
          additionalInfo.fcmToken = webFcmToken
          saveFcmToken(webFcmToken)
          console.log('[handleSocialUser] Web FCM token generated and saved')
        }
      }
    }

    // 1. Firebase UID로 기존 사용자 확인
    const userRef = doc(db, 'users', firebaseUser.uid)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      // 기존 사용자 - 로그인 처리
      const userData = userDoc.data()
      const userEmail = additionalInfo.email || firebaseUser.email || userData.email || ''

      const updateData: {
        email: string;
        lastLoginAt: Date;
        updatedAt: Date;
        fcmToken?: string;
      } = {
        ...userData,
        email: userEmail, // 이메일 확실히 저장
        lastLoginAt: new Date(),
        updatedAt: new Date()
      }

      // FCM 토큰이 있으면 저장
      if (additionalInfo.fcmToken) {
        updateData.fcmToken = additionalInfo.fcmToken
        console.log('[handleSocialUser] Updating FCM token for existing user:', additionalInfo.fcmToken)
      }

      await setDoc(userRef, updateData, { merge: true })

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
        // 중복된 이메일 발견 - Authentication 계정 삭제
        try {
          const currentUser = auth.currentUser
          if (currentUser) {
            await deleteUser(currentUser)
            console.log('[handleSocialUser] Deleted duplicate auth account:', currentUser.uid)
          }
        } catch (deleteError) {
          console.error('[handleSocialUser] Failed to delete duplicate auth account:', deleteError)
        }

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

      const socialUserData: {
        email: string | null;
        name: string;
        phone: string;
        provider: string;
        level: number;
        type: string;
        registrationComplete: boolean;
        createdAt: Date;
        updatedAt: Date;
        fcmToken?: string;
      } = {
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

      // FCM 토큰이 있으면 저장
      if (additionalInfo.fcmToken) {
        socialUserData.fcmToken = additionalInfo.fcmToken
        console.log('[handleSocialUser] Saving FCM token for new user:', additionalInfo.fcmToken)
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

// WebView 감지 함수
function isWebView() {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  const isAndroid = /android/.test(userAgent)
  const isIOS = /iphone|ipad|ipod/.test(userAgent)

  // Android WebView 감지
  const isAndroidWebView = isAndroid && /wv/.test(userAgent)

  // iOS WebView 감지 (Safari가 아닌 경우)
  const isIOSWebView = isIOS && !/(safari)/.test(userAgent)

  return isAndroidWebView || isIOSWebView
}

// 구글 로그인 (환경에 따라 Popup 또는 Redirect)
export async function signInWithGoogle() {
  try {
    console.log('[signInWithGoogle] Starting Google login...')

    // 네이티브 앱인 경우 메시지 전달
    interface WindowWithNative extends Window {
      isNativeApp?: boolean;
      ReactNativeWebView?: {
        postMessage: (message: string) => void;
      };
    }
    const nativeWindow = window as unknown as WindowWithNative;

    if (typeof window !== 'undefined' && nativeWindow.isNativeApp && nativeWindow.ReactNativeWebView) {
      console.log('[signInWithGoogle] Detected native app, sending message to native')
      nativeWindow.ReactNativeWebView.postMessage(JSON.stringify({ type: 'GOOGLE_LOGIN' }))
      return { success: true, isNativeHandling: true }
    }

    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')
    provider.addScope('https://www.googleapis.com/auth/userinfo.email')
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile')

    const useRedirect = isWebView()
    console.log('[signInWithGoogle] Using redirect:', useRedirect)

    if (useRedirect) {
      // WebView에서는 Redirect 사용
      console.log('[signInWithGoogle] Calling signInWithRedirect...')
      await signInWithRedirect(auth, provider)
      return { success: true, isRedirecting: true }
    } else {
      // 일반 브라우저에서는 Popup 사용
      console.log('[signInWithGoogle] Calling signInWithPopup...')
      const result = await signInWithPopup(auth, provider)
      console.log('[signInWithGoogle] Popup login successful')

      // 추가 정보 가져오기
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const token = credential?.accessToken

      let additionalInfo = {
        name: result.user.displayName,
        email: result.user.email,
        phone: null
      }

      if (token) {
        try {
          const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`)
          if (response.ok) {
            const userInfo = await response.json()
            additionalInfo = {
              name: userInfo.name || result.user.displayName,
              email: userInfo.email || result.user.email,
              phone: null
            }
          }
        } catch (error) {
          console.warn('Failed to fetch additional Google user info:', error)
        }
      }

      return await handleSocialUser(result.user, 'google', additionalInfo)
    }
  } catch (error: unknown) {
    console.error('[signInWithGoogle] Error:', error)
    // 사용자가 팝업을 닫은 경우
    if ((error as { code?: string }).code === 'auth/popup-closed-by-user') {
      return { success: false, error: '로그인이 취소되었습니다.' }
    }
    return { success: false, error: '구글 로그인 중 오류가 발생했습니다.' }
  }
}


// 카카오톡 로그인 (환경에 따라 Popup 또는 Redirect)
export async function signInWithKakao() {
  try {
    console.log('[signInWithKakao] Starting Kakao login...')

    // 네이티브 앱인 경우 메시지 전달
    interface WindowWithNative extends Window {
      isNativeApp?: boolean;
      ReactNativeWebView?: {
        postMessage: (message: string) => void;
      };
    }
    const nativeWindow = window as unknown as WindowWithNative;

    if (typeof window !== 'undefined' && nativeWindow.isNativeApp && nativeWindow.ReactNativeWebView) {
      console.log('[signInWithKakao] Detected native app, sending message to native')
      nativeWindow.ReactNativeWebView.postMessage(JSON.stringify({ type: 'KAKAO_LOGIN' }))
      return { success: true, isNativeHandling: true }
    }

    const provider = new OAuthProvider('oidc.kakao')

    provider.addScope('openid')
    provider.addScope('account_email')
    provider.addScope('profile_nickname')

    provider.setCustomParameters({
      'prompt': 'consent'
    })

    const useRedirect = isWebView()
    console.log('[signInWithKakao] Using redirect:', useRedirect)

    if (useRedirect) {
      // WebView에서는 Redirect 사용
      console.log('[signInWithKakao] Calling signInWithRedirect...')
      await signInWithRedirect(auth, provider)
      return { success: true, isRedirecting: true }
    } else {
      // 일반 브라우저에서는 Popup 사용
      console.log('[signInWithKakao] Calling signInWithPopup...')
      const result = await signInWithPopup(auth, provider)
      console.log('[signInWithKakao] Popup login successful')

      let userEmail = result.user.email

      if (!userEmail && result.user.providerData.length > 0) {
        userEmail = result.user.providerData[0].email
      }

      if (!userEmail) {
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

      return await handleSocialUser(result.user, 'kakao', additionalInfo)
    }
  } catch (error: unknown) {
    console.error('[signInWithKakao] Error:', error)
    // 사용자가 팝업을 닫은 경우
    if ((error as { code?: string }).code === 'auth/popup-closed-by-user') {
      return { success: false, error: '로그인이 취소되었습니다.' }
    }
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

      // Google 로그인 추가 정보 처리
      if (provider === 'google') {
        const credential = GoogleAuthProvider.credentialFromResult(result)
        const token = credential?.accessToken

        let additionalInfo = {
          name: result.user.displayName,
          email: result.user.email,
          phone: null
        }

        if (token) {
          try {
            const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`)
            if (response.ok) {
              const userInfo = await response.json()
              additionalInfo = {
                name: userInfo.name || result.user.displayName,
                email: userInfo.email || result.user.email,
                phone: null
              }
            }
          } catch (error) {
            console.warn('Failed to fetch additional Google user info:', error)
          }
        }

        return await handleSocialUser(result.user, 'google', additionalInfo)
      }

      // Kakao 로그인 추가 정보 처리
      if (provider === 'kakao') {
        let userEmail = result.user.email

        if (!userEmail && result.user.providerData.length > 0) {
          userEmail = result.user.providerData[0].email
        }

        if (!userEmail) {
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

        return await handleSocialUser(result.user, 'kakao', additionalInfo)
      }

      // 기타 provider
      return await handleSocialUser(result.user, provider)
    }
    return null
  } catch (error: unknown) {
    console.error('Redirect result error:', error)
    return { success: false, error: '소셜 로그인 중 오류가 발생했습니다.' }
  }
}