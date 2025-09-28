'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'
import { signupUser } from '@/lib/auth'
import AuthGuard from './AuthGuard'
import styles from './PartnerSignupPage.module.css'

export default function PartnerSignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    brandName: '',
    businessRegistration: null as File | null,
    representativeName: '',
    phoneNumber: '',
    contactEmail: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    businessAddress: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({
        ...formData,
        businessRegistration: e.target.files[0]
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const validationError =
      formData.password !== formData.confirmPassword ? '비밀번호가 일치하지 않습니다.' :
      formData.password.length < 6 ? '비밀번호는 6자 이상이어야 합니다.' :
      null

    if (validationError) {
      setError(validationError)
      setIsLoading(false)
      return
    }

    try {
      console.log('Calling signupUser for partner...')
      const result = await signupUser({
        email: formData.email,
        password: formData.password,
        name: formData.email, // 파트너는 이메일을 이름으로 사용
        type: 'partner'
      })

      console.log('signupUser result:', result)

      if (result.success) {
        alert('파트너 회원가입이 완료되었습니다!')
        router.push('/login')
      } else {
        if (result.existingUserType) {
          const userType = result.existingUserType === 'partner' ? '파트너 회원' : '일반 회원'
          setError(`이미 ${userType}으로 가입된 이메일입니다.`)
        } else {
          setError(result.error || '회원가입 중 오류가 발생했습니다.')
        }
      }
    } catch (error) {
      console.error('Caught error:', error)
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      console.log('Setting loading to false')
      setIsLoading(false)
    }
  }

  return (
    <AuthGuard requireAuth={false}>
      <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            파트너 회원가입
          </h2>
          <p className={styles.subtitle}>
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className={styles.loginLink}>
              로그인하기
            </Link>
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            {/* 업체명/브랜드명 */}
            <div className={styles.inputGroup}>
              <label htmlFor="companyName" className={styles.label}>
                업체명 *
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={handleChange}
                className={styles.input}
                placeholder="업체명을 입력해주세요"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="brandName" className={styles.label}>
                브랜드명
              </label>
              <input
                id="brandName"
                name="brandName"
                type="text"
                value={formData.brandName}
                onChange={handleChange}
                className={styles.input}
                placeholder="브랜드명을 입력해주세요 (선택사항)"
              />
            </div>

            {/* 사업자등록증 업로드 */}
            <div className={styles.inputGroup}>
              <label htmlFor="businessRegistration" className={styles.label}>
                사업자등록증 *
              </label>
              <input
                id="businessRegistration"
                name="businessRegistration"
                type="file"
                accept="image/*,.pdf"
                required
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              {formData.businessRegistration && (
                <p className={styles.fileName}>{formData.businessRegistration.name}</p>
              )}
            </div>

            {/* 대표자 이름 */}
            <div className={styles.inputGroup}>
              <label htmlFor="representativeName" className={styles.label}>
                대표자 이름 *
              </label>
              <input
                id="representativeName"
                name="representativeName"
                type="text"
                required
                value={formData.representativeName}
                onChange={handleChange}
                className={styles.input}
                placeholder="대표자 이름을 입력해주세요"
              />
            </div>

            {/* 대표 연락처 */}
            <div className={styles.inputGroup}>
              <label htmlFor="phoneNumber" className={styles.label}>
                대표 연락처 *
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={handleChange}
                className={styles.input}
                placeholder="010-1234-5678"
              />
            </div>

            {/* 대표 이메일 */}
            <div className={styles.inputGroup}>
              <label htmlFor="contactEmail" className={styles.label}>
                대표 이메일 *
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} />
                <input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="contact@company.com"
                />
              </div>
            </div>

            {/* 정산용 계좌정보 */}
            <div className={styles.sectionTitle}>정산용 계좌정보</div>
            <div className={styles.inputGroup}>
              <label htmlFor="bankName" className={styles.label}>
                은행명 *
              </label>
              <input
                id="bankName"
                name="bankName"
                type="text"
                required
                value={formData.bankName}
                onChange={handleChange}
                className={styles.input}
                placeholder="예: 국민은행"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="accountNumber" className={styles.label}>
                계좌번호 *
              </label>
              <input
                id="accountNumber"
                name="accountNumber"
                type="text"
                required
                value={formData.accountNumber}
                onChange={handleChange}
                className={styles.input}
                placeholder="계좌번호를 입력해주세요"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="accountHolder" className={styles.label}>
                예금주 *
              </label>
              <input
                id="accountHolder"
                name="accountHolder"
                type="text"
                required
                value={formData.accountHolder}
                onChange={handleChange}
                className={styles.input}
                placeholder="예금주명을 입력해주세요"
              />
            </div>

            {/* 사업장 주소 */}
            <div className={styles.inputGroup}>
              <label htmlFor="businessAddress" className={styles.label}>
                사업장 주소 *
              </label>
              <textarea
                id="businessAddress"
                name="businessAddress"
                required
                value={formData.businessAddress}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="사업장 주소를 입력해주세요"
                rows={3}
              />
            </div>

            {/* 로그인 정보 */}
            <div className={styles.sectionTitle}>로그인 정보</div>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                로그인 이메일 *
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="login@company.com"
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                비밀번호 *
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="6자 이상 입력해주세요"
                />
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                비밀번호 확인 *
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="비밀번호를 다시 입력해주세요"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitButton}
            >
              {isLoading ? '가입 중...' : '파트너 가입'}
            </button>
          </div>

          <div className={styles.homeLink}>
            <Link href="/" className={styles.homeLinkText}>
              홈으로 돌아가기
            </Link>
          </div>
        </form>
      </div>
    </div>
    </AuthGuard>
  )
}