import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

interface SignupData {
  email: string
  password: string
  name: string
  companyName?: string
  phone?: string
}

export async function signupUser(userData: SignupData) {
  try {
    console.log('Starting signup process for:', userData.email)

    // 1. Firebase Authentication에 사용자 생성
    console.log('Creating Firebase user...')
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    )

    const firebaseUser = userCredential.user
    console.log('Firebase user created successfully:', firebaseUser.uid)

    // 2. Firestore에 사용자 정보 저장
    console.log('Saving user data to Firestore...')
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      email: userData.email,
      name: userData.name,
      companyName: userData.companyName || '',
      phone: userData.phone || '',
      level: 1, // 기본 레벨 1 (일반 사용자)
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('User data saved to Firestore successfully')
    return { success: true, user: firebaseUser }
  } catch (error: any) {
    console.error('Signup error:', error)

    // Firebase 에러 메시지를 한국어로 변환
    const errorMessages = {
      'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
      'auth/weak-password': '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
      'auth/invalid-email': '유효하지 않은 이메일 주소입니다.'
    }

    const errorMessage = errorMessages[error.code as keyof typeof errorMessages] || '회원가입 중 오류가 발생했습니다.'

    return { success: false, error: errorMessage }
  }
}