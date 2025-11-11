'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import styles from './SettlementAccountsPage.module.css'

interface SettlementAccount {
  bankCode: string
  bankName: string
  accountNumber: string
  holderName: string
  bankbookImage?: string
  createdAt: string
}

const BANK_LIST = [
  // 주요 시중은행
  { code: '004', name: 'KB국민은행' },
  { code: '088', name: '신한은행' },
  { code: '081', name: '하나은행' },
  { code: '020', name: '우리은행' },
  { code: '003', name: '기업은행' },
  { code: '023', name: 'SC제일은행' },
  { code: '027', name: '한국씨티은행' },

  // 특수은행
  { code: '002', name: '산업은행' },
  { code: '011', name: '농협은행' },
  { code: '012', name: '농협회원조합' },
  { code: '007', name: '수협은행' },
  { code: '071', name: '우체국' },

  // 지방은행
  { code: '031', name: '대구은행' },
  { code: '032', name: '부산은행' },
  { code: '034', name: '광주은행' },
  { code: '035', name: '제주은행' },
  { code: '037', name: '전북은행' },
  { code: '039', name: '경남은행' },

  // 상호금융
  { code: '045', name: '새마을금고' },
  { code: '048', name: '신협' },
  { code: '050', name: '저축은행' },
  { code: '064', name: '산림조합중앙회' },

  // 인터넷은행
  { code: '090', name: '카카오뱅크' },
  { code: '089', name: '케이뱅크' },
  { code: '092', name: '토스뱅크' },
]

export default function SettlementAccountsPage() {
  const { user, userData } = useAuth()
  const [account, setAccount] = useState<SettlementAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 입력 필드
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [bankbookFile, setBankbookFile] = useState<File | null>(null)
  const [bankbookPreview, setBankbookPreview] = useState<string>('')

  useEffect(() => {
    if (user) {
      fetchAccount()
    }
  }, [user])

  const fetchAccount = async () => {
    if (!user) return

    try {
      setLoading(true)
      const userRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const settlementAccount = userData?.settlementAccount

        if (settlementAccount) {
          setAccount({
            ...settlementAccount,
            createdAt: typeof settlementAccount.createdAt === 'string'
              ? settlementAccount.createdAt
              : settlementAccount.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('계좌 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelEdit = () => {
    setBankCode('')
    setAccountNumber('')
    setHolderName('')
    setBankbookFile(null)
    setBankbookPreview('')
    setIsBankModalOpen(false)
  }

  const handleBankbookImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    setBankbookFile(file)
    setBankbookPreview(URL.createObjectURL(file))
  }

  const handleRemoveBankbookImage = () => {
    if (bankbookPreview) {
      URL.revokeObjectURL(bankbookPreview)
    }
    setBankbookFile(null)
    setBankbookPreview('')
  }

  const handleBankSelect = (code: string) => {
    setBankCode(code)
    setIsBankModalOpen(false)
  }

  const handleSave = async () => {
    if (!bankCode || !accountNumber || !holderName) {
      alert('모든 항목을 입력해주세요.')
      return
    }

    // 계좌번호 형식 검증
    if (!/^\d+$/.test(accountNumber)) {
      alert('계좌번호는 숫자만 입력 가능합니다.')
      return
    }

    // 통장 사본 이미지 검증 (신규 등록 시 필수)
    if (!account && !bankbookFile) {
      alert('통장 사본 이미지를 업로드해주세요.')
      return
    }

    // 계좌가 이미 등록되어 있는 경우 확인
    if (account) {
      if (!confirm('등록된 계좌 정보를 변경하시겠습니까?')) {
        return
      }
    }

    if (!user) return

    setUploading(true)

    try {
      const userRef = doc(db, 'users', user.uid)
      let bankbookImageUrl = account?.bankbookImage || ''

      // 통장 사본 이미지 업로드
      if (bankbookFile) {
        const formData = new FormData()
        formData.append('file', bankbookFile)
        formData.append('type', 'business-registration')
        formData.append('userId', user.uid)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '통장 사본 업로드 실패')
        }

        const data = await response.json()
        bankbookImageUrl = data.url
      }

      const newAccount = {
        bankCode,
        bankName: getBankName(bankCode),
        accountNumber,
        holderName,
        bankbookImage: bankbookImageUrl,
        createdAt: account?.createdAt || new Date().toISOString()
      }

      // Firestore에 저장
      await setDoc(userRef, {
        settlementAccount: newAccount
      }, { merge: true })

      alert(account ? '계좌가 수정되었습니다.' : '계좌가 등록되었습니다.')
      setBankCode('')
      setAccountNumber('')
      setHolderName('')
      setBankbookFile(null)
      setBankbookPreview('')
      fetchAccount()
    } catch (error) {
      console.error('계좌 저장 오류:', error)
      alert('계좌 저장 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const getBankName = (bankCode: string) => {
    return BANK_LIST.find(bank => bank.code === bankCode)?.name || '기타'
  }

  const formatAccountNumber = (accountNumber: string) => {
    // 계좌번호를 4자리씩 끊어서 표시
    return accountNumber.replace(/(\d{4})(?=\d)/g, '$1-')
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
      <div className={styles.header}>
        <h1 className={styles.title}>정산계좌관리</h1>
      </div>

      {/* 정산 계좌 */}
      <div className={styles.section}>
        {/* 등록된 계좌 정보 (항상 표시) */}
        {account && (
          <div className={styles.accountCard}>
            <h3 className={styles.accountCardTitle}>등록된 계좌 정보</h3>
            <div className={styles.accountInfo}>
              <div className={styles.accountRow}>
                <span className={styles.accountLabel}>예금주명</span>
                <span className={styles.accountValue}>{account.holderName}</span>
              </div>
              <div className={styles.accountRow}>
                <span className={styles.accountLabel}>은행명</span>
                <span className={styles.accountValue}>{account.bankName}</span>
              </div>
              <div className={styles.accountRow}>
                <span className={styles.accountLabel}>계좌번호</span>
                <span className={styles.accountValue}>{formatAccountNumber(account.accountNumber)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 계좌 등록/수정 폼 */}
        <div className={styles.accountForm}>

          {/* 통장 사본과 예금주명 */}
          <div className={styles.formRow}>
            {/* 통장 사본 */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                통장 사본
                <span className={`${styles.submissionBadge} ${(account?.bankbookImage || bankbookFile) ? styles.submitted : styles.notSubmitted}`}>
                  {(account?.bankbookImage || bankbookFile) ? '제출완료' : '미제출'}
                </span>
              </label>
              <div className={styles.fileInputWrapper}>
                {account?.bankbookImage && !bankbookFile ? (
                  <input
                    type="text"
                    value={account.bankbookImage.split('/').pop() || '통장 사본'}
                    className={styles.readOnlyInput}
                    readOnly
                  />
                ) : (
                  <div className={styles.fileUploadInputWrapper}>
                    <input
                      type="text"
                      value={bankbookFile ? bankbookFile.name : ''}
                      className={styles.readOnlyInput}
                      placeholder="통장 사본이 등록되지 않았습니다"
                      readOnly
                    />
                    <label htmlFor="bankbookFile" className={styles.fileAttachButton}>
                      파일 첨부
                    </label>
                    <input
                      type="file"
                      id="bankbookFile"
                      accept="image/*"
                      onChange={handleBankbookImageSelect}
                      className={styles.hiddenFileInput}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 예금주명 */}
            <div className={styles.formGroup}>
              <label className={styles.label}>예금주명</label>
              <input
                type="text"
                className={styles.input}
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="예금주명을 입력하세요"
              />
            </div>
          </div>

          {/* 은행과 계좌번호 */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>은행명</label>
              <button
                type="button"
                className={styles.bankSelectButton}
                onClick={() => setIsBankModalOpen(true)}
              >
                {bankCode ? (
                  <div className={styles.selectedBank}>
                    <img
                      src={`/bank/${bankCode}.png`}
                      alt={getBankName(bankCode)}
                      className={styles.bankIcon}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <span>{getBankName(bankCode)}</span>
                  </div>
                ) : (
                  <span className={styles.placeholder}>은행 선택</span>
                )}
              </button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>계좌번호</label>
              <input
                type="text"
                className={styles.input}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="'-' 없이 숫자만 입력"
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className={styles.formActions}>
            <button
              className={styles.cancelButton}
              onClick={cancelEdit}
              disabled={uploading}
            >
              취소
            </button>
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={uploading}
            >
              {uploading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 안내사항 */}
      <div className={styles.infoBox}>
        <h3 className={styles.infoTitle}>안내사항</h3>
        <ul className={styles.infoList}>
          <li>정산금은 등록하신 계좌로 입금됩니다.</li>
          <li>계좌 정보는 정확하게 입력해주세요. 오류 시 정산이 지연될 수 있습니다.</li>
          <li>본인 명의의 계좌만 등록 가능합니다.</li>
        </ul>
      </div>

      {/* 은행 선택 모달 */}
      {isBankModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsBankModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>은행 선택</h3>
              <button
                className={styles.modalCloseButton}
                onClick={() => setIsBankModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.bankGrid}>
              {BANK_LIST.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  className={`${styles.bankGridItem} ${bankCode === bank.code ? styles.bankGridItemSelected : ''}`}
                  onClick={() => handleBankSelect(bank.code)}
                >
                  <img
                    src={`/bank/${bank.code}.png`}
                    alt={bank.name}
                    className={styles.bankGridLogo}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <span>{bank.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
