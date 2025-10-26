'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { deleteUser } from 'firebase/auth'
import styles from './WithdrawalPage.module.css'

export default function WithdrawalPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [selectedReason, setSelectedReason] = useState('')
  const [additionalFeedback, setAdditionalFeedback] = useState('')
  const [isAgreed, setIsAgreed] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const reasonOptions = [
    { value: '', label: '선택해주세요' },
    { value: '사용하기 어려워요', label: '사용하기 어려워요' },
    { value: '유용한 서비스가 없어요', label: '유용한 서비스가 없어요' },
    { value: '다른 서비스를 이용할래요', label: '다른 서비스를 이용할래요' },
    { value: '오류가 너무 잦아요', label: '오류가 너무 잦아요' },
    { value: '기타', label: '기타' }
  ]

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleWithdrawal = async () => {
    if (!selectedReason) {
      alert('탈퇴 사유를 선택해주세요.')
      return
    }
    if (!isAgreed) {
      alert('탈퇴 동의에 체크해주세요.')
      return
    }

    if (!user) {
      alert('로그인 정보를 찾을 수 없습니다.')
      return
    }

    if (!confirm('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    try {
      setIsProcessing(true)

      // 1. 기존 사용자 데이터 가져오기
      const userRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        throw new Error('사용자 정보를 찾을 수 없습니다.')
      }

      const userData = userDoc.data()

      // 2. withdrawnUsers 컬렉션에 데이터 저장
      const withdrawnUserRef = doc(db, 'withdrawnUsers', user.uid)
      await setDoc(withdrawnUserRef, {
        ...userData,
        withdrawalReason: selectedReason,
        withdrawalFeedback: additionalFeedback,
        withdrawalDate: serverTimestamp(),
        originalUserId: user.uid
      })

      // 3. users 컬렉션에서 사용자 데이터 삭제
      await deleteDoc(userRef)

      // 4. Firebase Auth에서 사용자 계정 삭제
      await deleteUser(user)

      // 5. 로그아웃 처리
      await logout()

      alert('회원 탈퇴가 완료되었습니다.')
      router.push('/login')
    } catch (error: unknown) {
      console.error('회원 탈퇴 실패:', error)
      if (error instanceof Error) {
        if (error.message.includes('auth/requires-recent-login')) {
          alert('보안을 위해 다시 로그인한 후 탈퇴를 진행해주세요.')
          await logout()
          router.push('/login')
        } else {
          alert('회원 탈퇴에 실패했습니다. 다시 시도해주세요.')
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleContinue = () => {
    router.push('/settings')
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>회원탈퇴</h1>

      <div className={styles.noticeSection}>
        <h2 className={styles.noticeTitle}>회원탈퇴하기 전 꼭 확인해주세요</h2>

        <div className={styles.noticeList}>
          <div className={styles.noticeItem}>
            <div className={styles.noticeContent}>
              <h3 className={styles.noticeItemTitle}>1. 포인트 잔액이 있는지 확인해 주세요</h3>
              <p className={styles.noticeText}>
                탈퇴 시, 보유하고 계신 포인트는 모두 소멸되며 복구가 불가능합니다.
                포인트를 사용하신 후 탈퇴를 진행해주세요.
              </p>
            </div>
          </div>

          <div className={styles.noticeItem}>
            <div className={styles.noticeContent}>
              <h3 className={styles.noticeItemTitle}>2. 진행 중인 주문 건이 없는지 확인해 주세요</h3>
              <p className={styles.noticeText}>
                배송 예정이거나 처리 중인 주문이 있을 경우 탈퇴가 제한되며,
                모든 주문이 완료 처리된 후에 탈퇴가 가능합니다.
              </p>
            </div>
          </div>

          <div className={styles.noticeItem}>
            <div className={styles.noticeContent}>
              <h3 className={styles.noticeItemTitle}>3. 탈퇴 시 모든 개인정보 및 이용 내역이 삭제됩니다</h3>
              <p className={styles.noticeText}>
                주문 내역, 리뷰, 찜한 상품 등 모든 정보가 삭제되며,
                탈퇴 후에는 복구가 불가능하므로 신중하게 진행해 주세요.
              </p>
            </div>
          </div>

          <div className={styles.noticeItem}>
            <div className={styles.noticeContent}>
              <h3 className={styles.noticeItemTitle}>4. 재가입 시 이전 데이터는 복구되지 않습니다</h3>
              <p className={styles.noticeText}>
                탈퇴 후 같은 정보로 재가입하더라도 이전 데이터는 복구되지 않으며,
                새로운 회원으로 가입됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.reasonSection}>
        <h2 className={styles.reasonTitle}>무엇이 불편하셨나요?</h2>
        <p className={styles.reasonSubtitle}>
          불편한 점을 알려주시면 더욱더 노력하는 단모가 되겠습니다.
        </p>

        <div className={styles.dropdownContainer} ref={dropdownRef}>
          <div
            className={styles.dropdownSelect}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className={styles.dropdownSelectedText}>
              {reasonOptions.find(option => option.value === selectedReason)?.label || '선택해주세요'}
            </span>
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`${styles.dropdownArrow} ${isDropdownOpen ? styles.dropdownArrowUp : ''}`}
            >
              <path
                d="M1 1L5 5L9 1"
                stroke="#999"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {isDropdownOpen && (
            <div className={styles.dropdownList}>
              {reasonOptions.map(option => (
                <div
                  key={option.value}
                  className={`${styles.dropdownOption} ${option.value === selectedReason ? styles.dropdownOptionSelected : ''}`}
                  onClick={() => {
                    setSelectedReason(option.value)
                    setIsDropdownOpen(false)
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <textarea
          className={styles.textarea}
          value={additionalFeedback}
          onChange={(e) => setAdditionalFeedback(e.target.value)}
          placeholder="추가로 불편하셨던 점이나 개선이 필요한 부분을 자유롭게 작성해주세요. (선택사항)"
          rows={5}
        />
      </div>

      <div className={styles.agreementSection}>
        <label className={styles.checkboxLabel}>
          <div className={styles.customCheckbox}>
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className={styles.checkboxInput}
            />
            <img
              src={isAgreed ? '/icons/check_active.png' : '/icons/check_empty.png'}
              alt="checkbox"
              className={styles.checkboxIcon}
            />
          </div>
          <span className={styles.checkboxText}>
            위 내용을 모두 확인하였으며, 회원 탈퇴에 동의합니다.
          </span>
        </label>
      </div>

      <div className={styles.buttonGroup}>
        <button
          onClick={handleContinue}
          className={styles.continueButton}
          disabled={isProcessing}
        >
          계속 이용하기
        </button>
        <button
          onClick={handleWithdrawal}
          className={styles.withdrawButton}
          disabled={!isAgreed || !selectedReason || isProcessing}
        >
          {isProcessing ? '처리 중...' : '회원탈퇴하기'}
        </button>
      </div>
    </div>
  )
}
