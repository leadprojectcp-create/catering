'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import styles from './PasswordChangePage.module.css'

export default function PasswordChangePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isEmailProvider, setIsEmailProvider] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSocialLoginModal, setShowSocialLoginModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (user) {
      // 사용자의 로그인 제공자 확인
      const providers = user.providerData.map(provider => provider.providerId)
      const isEmail = providers.includes('password')
      setIsEmailProvider(isEmail)
      setLoading(false)

      // 소셜 로그인 사용자면 모달 표시
      if (!isEmail) {
        setShowSocialLoginModal(true)
      }
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // 유효성 검사
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    if (newPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (currentPassword === newPassword) {
      setError('현재 비밀번호와 새 비밀번호가 동일합니다.')
      return
    }

    try {
      setLoading(true)

      if (!user || !user.email) {
        throw new Error('사용자 정보를 찾을 수 없습니다.')
      }

      // 현재 비밀번호로 재인증
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // 비밀번호 변경
      await updatePassword(user, newPassword)

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // 2초 후 설정 페이지로 이동
      setTimeout(() => {
        router.push('/partner/settings')
      }, 2000)
    } catch (error: unknown) {
      console.error('비밀번호 변경 실패:', error)
      if (error instanceof Error) {
        if (error.message.includes('auth/wrong-password') || error.message.includes('auth/invalid-credential')) {
          setError('현재 비밀번호가 올바르지 않습니다.')
        } else if (error.message.includes('auth/weak-password')) {
          setError('비밀번호가 너무 약합니다.')
        } else {
          setError('비밀번호 변경에 실패했습니다. 다시 시도해주세요.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 소셜 로그인 모달 */}
      {showSocialLoginModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalIcon}>ℹ️</div>
            <h2 className={styles.modalTitle}>비밀번호 변경 불가</h2>
            <p className={styles.modalMessage}>
              소셜 로그인은 비밀번호를 변경할 수 없습니다.
            </p>
            <p className={styles.modalSubmessage}>
              소셜 로그인 계정의 비밀번호는 해당 소셜 서비스에서 관리됩니다.
            </p>
            <button
              onClick={() => router.push('/partner/settings')}
              className={styles.modalButton}
            >
              확인
            </button>
          </div>
        </div>
      )}

      <h1 className={styles.title}>비밀번호 변경</h1>

      {isEmailProvider && (
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {success && (
            <div className={styles.successMessage}>
              비밀번호가 성공적으로 변경되었습니다!
            </div>
          )}

          <div className={styles.noticeSection}>
            <h2 className={styles.noticeTitle}>비밀번호 변경시 유의사항</h2>
            <div className={styles.noticeList}>
              <div className={styles.noticeItem}>
                <span className={styles.noticeBullet}>•</span>
                <span>8자 ~15자 길이로 만들어주세요.</span>
              </div>
              <div className={styles.noticeItem}>
                <span className={styles.noticeBullet}>•</span>
                <span>영문 대/소문자, 특수 문자 2가지를 조합해주세요.</span>
              </div>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>현재 비밀번호</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={styles.input}
                placeholder="현재 비밀번호를 입력하세요"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className={styles.passwordToggle}
                aria-label={showCurrentPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              >
                <img
                  src={showCurrentPassword ? "/icons/eye_closed.svg" : "/icons/eye_open.svg"}
                  alt={showCurrentPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                />
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>새 비밀번호</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
                placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={styles.passwordToggle}
                aria-label={showNewPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              >
                <img
                  src={showNewPassword ? "/icons/eye_closed.svg" : "/icons/eye_open.svg"}
                  alt={showNewPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                />
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>새 비밀번호 확인</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                placeholder="새 비밀번호를 다시 입력하세요"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles.passwordToggle}
                aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              >
                <img
                  src={showConfirmPassword ? "/icons/eye_closed.svg" : "/icons/eye_open.svg"}
                  alt={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      )}
    </div>
  )
}
