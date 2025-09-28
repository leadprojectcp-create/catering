'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Mail, Lock, Building, Phone } from 'lucide-react'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import AuthGuard from './AuthGuard'
import styles from './CompleteSignupPage.module.css'

export default function CompleteSignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const userType = searchParams.get('type') as 'user' | 'partner'

  const [formData, setFormData] = useState({
    // 공통 필드
    name: '',
    phone: '',

    // 일반 회원 필드
    companyName: '',

    // 파트너 회원 필드
    businessName: '',
    brandName: '',
    representativeName: '',
    contactEmail: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    businessAddress: '',
    businessRegistration: null as File | null
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userType) {
      router.push('/signup/choose-type')
    }
  }, [userType, router])

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

    try {
      // 현재 로그인된 사용자의 UID 사용 (소셜 로그인으로 이미 인증됨)
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('로그인된 사용자를 찾을 수 없습니다.')
      }

      // Firestore에 최종 사용자 정보 저장 (기존 데이터 업데이트)
      const finalUserData = {
        name: formData.name,
        type: userType,
        level: 1,
        registrationComplete: true,
        updatedAt: new Date(),

        // 타입별 추가 정보
        ...(userType === 'user' ? {
          companyName: formData.companyName || '',
          phone: formData.phone || ''
        } : {
          businessName: formData.businessName,
          brandName: formData.brandName || '',
          representativeName: formData.representativeName,
          contactEmail: formData.contactEmail,
          phone: formData.phone,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountHolder: formData.accountHolder,
          businessAddress: formData.businessAddress,
          // 사업자등록증은 별도 업로드 로직 필요
        })
      }

      // Firestore에 사용자 정보 병합 저장
      await setDoc(doc(db, 'users', currentUser.uid), finalUserData, { merge: true })

      alert(`${userType === 'user' ? '일반' : '파트너'} 회원가입이 완료되었습니다!`)
      router.push('/')

    } catch (error) {
      console.error('Complete signup error:', error)
      setError('회원가입 완료 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!userType) {
    return <div>로딩 중...</div>
  }

  return (
    <AuthGuard requireAuth={true} requireCompleteRegistration={false}>
      <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {userType === 'user' ? '일반 회원' : '파트너 회원'} 가입 완료
          </h2>
          <p className={styles.subtitle}>
            추가 정보를 입력해주세요
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* 공통 필드 */}
          <div className={styles.inputGroup}>
            <label htmlFor="name" className={styles.label}>
              이름 *
            </label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} />
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="이름을 입력해주세요"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="phone" className={styles.label}>
              전화번호 *
            </label>
            <div className={styles.inputWrapper}>
              <Phone className={styles.inputIcon} />
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className={styles.input}
                placeholder="010-1234-5678"
              />
            </div>
          </div>

          {userType === 'user' ? (
            // 일반 회원 필드
            <div className={styles.inputGroup}>
              <label htmlFor="companyName" className={styles.label}>
                회사/단체명
              </label>
              <div className={styles.inputWrapper}>
                <Building className={styles.inputIcon} />
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="회사명 (선택사항)"
                />
              </div>
            </div>
          ) : (
            // 파트너 회원 필드
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="businessName" className={styles.label}>
                  업체명 *
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  value={formData.businessName}
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
                  placeholder="브랜드명 (선택사항)"
                />
              </div>

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
            </>
          )}

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? '가입 완료 중...' : '가입 완료'}
          </button>
        </form>
      </div>
    </div>
    </AuthGuard>
  )
}