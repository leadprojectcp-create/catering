'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getTaxInvoiceInfo, saveTaxInvoiceInfo } from '@/lib/services/taxInvoiceService'
import styles from './TaxInvoiceModal.module.css'

interface TaxInvoiceModalProps {
  onClose: () => void
  paymentId: string
  orderId: string
  totalAmount: number
}

export default function TaxInvoiceModal({
  onClose,
  paymentId,
  orderId,
  totalAmount,
}: TaxInvoiceModalProps) {
  const { user } = useAuth()
  const [businessNumber, setBusinessNumber] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [ceoName, setCeoName] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 저장된 세금계산서 정보 불러오기
  useEffect(() => {
    const loadTaxInvoiceInfo = async () => {
      if (!user?.uid) return

      setIsLoading(true)
      try {
        const savedInfo = await getTaxInvoiceInfo(user.uid)
        if (savedInfo) {
          setBusinessNumber(savedInfo.businessNumber)
          setCompanyName(savedInfo.companyName)
          setCeoName(savedInfo.ceoName)
          setBusinessAddress(savedInfo.businessAddress)
          setBusinessType(savedInfo.businessType)
          setBusinessCategory(savedInfo.businessCategory)
          setEmail(savedInfo.email)
        }
      } catch (error) {
        console.error('저장된 정보 불러오기 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTaxInvoiceInfo()
  }, [user?.uid])

  // 사업자등록번호 포맷팅 함수 (000-00-00000)
  const formatBusinessNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '')

    // 최대 10자리까지만
    const limitedNumbers = numbers.slice(0, 10)

    // 하이픈 추가
    if (limitedNumbers.length <= 3) {
      return limitedNumbers
    } else if (limitedNumbers.length <= 5) {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`
    } else {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 5)}-${limitedNumbers.slice(5)}`
    }
  }

  // 사업자등록번호 변경 핸들러
  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBusinessNumber(e.target.value)
    setBusinessNumber(formatted)
  }

  const handleSaveInfo = async () => {
    if (!businessNumber || !companyName || !ceoName || !email) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    if (!user?.uid) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      const success = await saveTaxInvoiceInfo(user.uid, {
        businessNumber,
        companyName,
        ceoName,
        businessAddress,
        businessType,
        businessCategory,
        email,
      })

      if (success) {
        alert('세금계산서 정보가 저장되었습니다.')
      } else {
        alert('정보 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('정보 저장 오류:', error)
      alert('정보 저장 중 오류가 발생했습니다.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!businessNumber || !companyName || !ceoName || !email) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    if (!user?.uid) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch('/api/tax-invoice/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId,
          orderId,
          businessNumber,
          companyName,
          ceoName,
          businessAddress,
          businessType,
          businessCategory,
          email,
          totalAmount,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 세금계산서 발급 성공 시 정보 저장
        await saveTaxInvoiceInfo(user.uid, {
          businessNumber,
          companyName,
          ceoName,
          businessAddress,
          businessType,
          businessCategory,
          email,
        })

        alert('세금계산서가 발급되었습니다.')
        onClose()
      } else {
        alert(data.error || '세금계산서 발급에 실패했습니다.')
      }
    } catch (error) {
      console.error('세금계산서 발급 오류:', error)
      alert('세금계산서 발급 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>세금계산서 발급</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className={styles.form} style={{ textAlign: 'center', padding: '40px' }}>
            <p>저장된 정보를 불러오는 중...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                사업자등록번호 <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={businessNumber}
                onChange={handleBusinessNumberChange}
                placeholder="000-00-00000"
                required
              />
              <p className={styles.helperText}>숫자만 입력하시면 자동으로 하이픈이 추가됩니다.</p>
            </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              상호명 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="회사명 입력"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              대표자명 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={ceoName}
              onChange={(e) => setCeoName(e.target.value)}
              placeholder="대표자 이름 입력"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>사업장 주소</label>
            <input
              type="text"
              className={styles.input}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="사업장 주소 입력 (선택)"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>업태</label>
              <input
                type="text"
                className={styles.input}
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="예: 서비스업"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>종목</label>
              <input
                type="text"
                className={styles.input}
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                placeholder="예: 일반"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              계산서를 받을 이메일주소를 정확히 입력해주세요 <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="세금계산서 수신 이메일"
              required
            />
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSaveInfo}
              disabled={isSubmitting}
            >
              정보 저장
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? '발급 중...' : '발급하기'}
            </button>
          </div>
          </form>
        )}
      </div>
    </div>
  )
}
