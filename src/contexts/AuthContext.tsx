'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface UserData {
  uid: string
  email: string
  name: string
  level: number
  type?: string
  companyName?: string
  phone?: string
  registrationComplete?: boolean
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  logout: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('로그아웃 오류:', error)
      throw error
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser)

          // Firestore에서 사용자 데이터 가져오기
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
            if (userDoc.exists()) {
              const data = userDoc.data()
              setUserData({
                uid: firebaseUser.uid,
                email: data.email,
                name: data.name,
                level: data.level || 1, // 기본 레벨 1
                type: data.type,
                companyName: data.companyName,
                phone: data.phone,
                registrationComplete: data.registrationComplete || false
              })
            } else {
              // 사용자 문서가 없으면 null로 설정
              setUserData(null)
            }
          } catch (error) {
            console.error('사용자 데이터 로드 오류:', error)
            setUserData(null)
          }
        } else {
          setUser(null)
          setUserData(null)
        }
      } finally {
        // 모든 경우에 로딩 완료
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}