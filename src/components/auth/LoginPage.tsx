'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // TODO: API 호출로 로그인 처리
      console.log('로그인 데이터:', formData)

      // 임시로 성공 처리
      alert('로그인 성공!')
      router.push('/')
    } catch (err) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-10 shadow-lg">
        <div className="text-center mb-8">
          <div className="text-[#FE4651] text-4xl font-semibold font-['Hakgyoansim_Allimjang_OTF'] tracking-widest mb-6">
            TRIPJOY
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            로그인
          </h2>
          <p className="text-gray-600 text-sm">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
              회원가입하기
            </Link>
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* 이메일 */}
            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm bg-white transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="이메일을 입력해주세요"
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div className="mb-5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm bg-white transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="비밀번호를 입력해주세요"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between my-6">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="w-4 h-4 text-blue-600 border border-gray-300 rounded mr-2 focus:ring-2 focus:ring-blue-100"
              />
              <label htmlFor="remember-me" className="text-sm text-gray-800">
                로그인 상태 유지
              </label>
            </div>

            <div>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                비밀번호를 잊으셨나요?
              </a>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center my-4">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>

          {/* 소셜 로그인 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-600">또는</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="w-full flex items-center justify-center py-3.5 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-6"
              onClick={() => {
                // TODO: Google 로그인 구현
                console.log('Google 로그인')
              }}
            >
              <span className="mr-2">🔍</span>
              Google로 로그인
            </button>
          </div>

          <div className="text-center">
            <Link href="/" className="text-gray-600 hover:text-gray-800 text-sm">
              홈으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}