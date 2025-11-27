'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'firebase/auth'
import { serverTimestamp } from 'firebase/firestore'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import AuthGuard from './AuthGuard'
import Loading from '@/components/Loading'
import AddressSearchModal from '@/components/common/AddressSearchModal'
import styles from './SignupPage.module.css'

interface Step1Data {
  email: string;
  password?: string;
  name: string;
  phone: string;
  termsAgreements: {
    service: boolean;
    privacy: boolean;
    marketing?: boolean;
  };
}

export default function PartnerSignupStep2() {
  const router = useRouter()
  const { user } = useAuth()
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [formData, setFormData] = useState({
    storeName: '',
    businessRegistration: '',
    businessOwner: '',
    businessPhone: '',
    businessRegistrationImage: '',
    address: '',
    detailAddress: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)

  useEffect(() => {
    // Step 1 데이터 확인
    const savedData = sessionStorage.getItem('partnerSignupStep1')
    if (!savedData) {
      router.push('/signup/partner/step1')
      return
    }
    setStep1Data(JSON.parse(savedData))
  }, [router])


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }


  const handleAddressComplete = (data: {
    address: string
    roadAddress: string
    jibunAddress: string
    zonecode: string
  }) => {
    setFormData({
      ...formData,
      address: data.address
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 크기는 5MB 이하여야 합니다.')
      return
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      // FormData 생성
      const formDataToUpload = new FormData()
      formDataToUpload.append('file', file)
      formDataToUpload.append('type', 'business-registration') // 사업자 등록증 타입 지정

      // 사용자 이메일을 식별자로 사용 (회원가입 전이므로 UID가 없음)
      if (step1Data?.email) {
        // 이메일에서 @ 와 . 을 언더스코어로 변경하여 폴더명으로 사용 가능하게 함
        const sanitizedEmail = step1Data.email.replace(/[@.]/g, '_')
        formDataToUpload.append('userId', sanitizedEmail)
      }

      // 업로드 API 호출
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataToUpload
      })

      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다.')
      }

      const data = await response.json()

      setFormData({
        ...formData,
        businessRegistrationImage: data.url
      })
      setUploadedFileName(file.name)
    } catch (error) {
      console.error('Image upload error:', error)
      setError('이미지 업로드 중 오류가 발생했습니다.')
      setUploadedFileName('')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      businessRegistrationImage: ''
    })
    setUploadedFileName('')
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
      alert('로그아웃 중 오류가 발생했습니다.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // 사업자 정보 검증
    const validationError =
      !formData.storeName ? '판매자명을 입력해주세요.' :
      !formData.businessRegistration ? '사업자등록번호를 입력해주세요.' :
      !formData.businessOwner ? '사업자 대표이름을 입력해주세요.' :
      !formData.address ? '판매자 주소를 입력해주세요.' :
      null

    if (validationError) {
      setError(validationError)
      setIsLoading(false)
      return
    }

    if (!step1Data) {
      setError('회원가입 정보를 찾을 수 없습니다.')
      setIsLoading(false)
      return
    }

    try {
      // Step1에서 저장한 UID 가져오기
      const uid = sessionStorage.getItem('partnerSignupUid')
      if (!uid) {
        setError('사용자 정보를 찾을 수 없습니다.')
        setIsLoading(false)
        return
      }

      // Google Geocoding API로 위도/경도 가져오기
      let latitude: number | undefined = undefined
      let longitude: number | undefined = undefined

      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.address)}&key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`
        const geocodeResponse = await fetch(geocodeUrl)

        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json()

          if (geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
            latitude = geocodeData.results[0].geometry.location.lat
            longitude = geocodeData.results[0].geometry.location.lng
            console.log('Geocoding 성공:', { latitude, longitude })
          } else {
            console.warn('Geocoding 실패:', geocodeData.status)
          }
        }
      } catch (geocodeError) {
        console.error('Geocoding API 호출 오류:', geocodeError)
        // Geocoding 실패해도 회원가입은 진행 (위치 정보 없이)
      }

      // stores 컬렉션에 가게 정보 저장
      const { doc, setDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const storeData = {
        partnerId: uid,
        storeName: formData.storeName,
        businessRegistration: formData.businessRegistration,
        businessRegistrationImage: formData.businessRegistrationImage || '',
        businessOwner: formData.businessOwner,
        businessPhone: formData.businessPhone,
        address: {
          city: formData.address.split(' ')[0] || '',
          district: formData.address.split(' ')[1] || '',
          dong: formData.address.split(' ')[2] || '',
          detail: formData.detailAddress,
          fullAddress: formData.address,
          ...(latitude !== undefined && longitude !== undefined && { latitude, longitude })
        },
        phone: step1Data.phone,
        description: '',
        closedDays: [],
        status: 'pending', // 'pending' | 'active' | 'inactive' - 검수 대기 중
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await setDoc(doc(db, 'stores', uid), storeData)

      // users 컬렉션 업데이트 - 회원가입 완료 처리만
      const userRef = doc(db, 'users', uid)
      await setDoc(userRef, {
        registrationComplete: true, // Step2 완료 시점에 회원가입 완료 처리
        updatedAt: serverTimestamp()
      }, { merge: true })

      // Step3 표시용 데이터 저장
      const step2Data = {
        storeName: formData.storeName,
        businessOwner: formData.businessOwner,
        city: formData.address.split(' ')[0] || '',
        district: formData.address.split(' ')[1] || '',
        dong: formData.address.split(' ')[2] || '',
        detailAddress: formData.detailAddress
      }
      sessionStorage.setItem('partnerSignupStep2', JSON.stringify(step2Data))

      // Step3로 이동
      router.push('/signup/partner/step3')
    } catch (error) {
      console.error('Partner signup step2 error:', error)
      if (error instanceof Error) {
        setError(`가게 정보 저장 중 오류가 발생했습니다: ${error.message}`)
      } else {
        setError('가게 정보 저장 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!step1Data) {
    return <Loading />
  }

  return (
    <AuthGuard requireAuth={true} requireCompleteRegistration={false}>
      <AddressSearchModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onComplete={handleAddressComplete}
      />
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.header}>
            {/* Progress indicator */}
            <div className={`${styles.progressContainer} ${styles.step2}`}>
              <div className={styles.progressItem}>
                <div className={`${styles.progressCircle} ${styles.completed}`}>1</div>
              </div>
              <div className={styles.progressItem}>
                <div className={`${styles.progressCircle} ${styles.active}`}>2</div>
              </div>
              <div className={styles.progressItem}>
                <div className={styles.progressCircle}>3</div>
              </div>
            </div>

            <h1 className={styles.title}>
              파트너님의<br />
              사업자 정보를 입력해주세요
            </h1>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div>
              {/* 판매자명 */}
              <div className={styles.inputGroup}>
                <label htmlFor="storeName" className={styles.label}>
                  판매자명
                </label>
                <input
                  id="storeName"
                  name="storeName"
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="판매자명을 입력해주세요"
                />
              </div>

              {/* 사업자등록번호 */}
              <div className={styles.inputGroup}>
                <label htmlFor="businessRegistration" className={styles.label}>
                  사업자등록번호
                </label>
                <input
                  id="businessRegistration"
                  name="businessRegistration"
                  type="text"
                  required
                  value={formData.businessRegistration}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="사업자등록번호를 입력해주세요"
                />
              </div>

              {/* 사업자 대표이름 */}
              <div className={styles.inputGroup}>
                <label htmlFor="businessOwner" className={styles.label}>
                  사업자 대표이름
                </label>
                <input
                  id="businessOwner"
                  name="businessOwner"
                  type="text"
                  required
                  value={formData.businessOwner}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="사업자 대표이름을 입력해주세요"
                />
              </div>

              {/* 판매자 대표전화 */}
              <div className={styles.inputGroup}>
                <label htmlFor="businessPhone" className={styles.label}>
                  판매자 대표전화
                </label>
                <input
                  id="businessPhone"
                  name="businessPhone"
                  type="tel"
                  required
                  value={formData.businessPhone}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="판매자 대표전화를 입력해주세요"
                />
              </div>

              {/* 사업자 등록증 이미지 추가 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  사업자 등록증 이미지 추가
                </label>
                <div className={styles.fileInputContainer}>
                  <div className={styles.fileDisplayArea}>
                    {uploadedFileName ? (
                      <>
                        <span className={styles.fileName}>{uploadedFileName}</span>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className={styles.removeButton}
                          disabled={isUploading}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className={styles.filePlaceholder}>파일을 첨부해주세요</span>
                    )}
                  </div>
                  <label htmlFor="businessRegistrationImage" className={styles.fileUploadButton}>
                    <input
                      id="businessRegistrationImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className={styles.fileInput}
                      disabled={isUploading}
                    />
                    {isUploading ? '업로드 중...' : '파일첨부'}
                  </label>
                </div>
              </div>

              {/* 판매자 주소 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  판매자 주소
                </label>
                <div className={styles.addressContainer}>
                  <input
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    className={styles.addressInput}
                    placeholder="주소 검색을 클릭해주세요"
                    readOnly
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(true)}
                    className={styles.addressSearchButton}
                  >
                    주소 검색
                  </button>
                </div>
                <input
                  name="detailAddress"
                  type="text"
                  value={formData.detailAddress}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="상세주소를 입력해주세요"
                  style={{ marginTop: '10px' }}
                />
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
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : '다음'}
              </button>
            </div>

            <div className={styles.backLink}>
              <Link href="/signup/partner/step1" className={styles.backLinkText}>
                이전으로 돌아가기
              </Link>
            </div>

            {user && (
              <div className={styles.backLink}>
                <button
                  onClick={handleLogout}
                  className={styles.backLinkText}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  로그아웃
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}