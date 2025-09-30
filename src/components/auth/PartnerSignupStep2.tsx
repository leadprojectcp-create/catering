'use client'

interface DaumPostcodeData {
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: 'R' | 'J';
}

interface DaumPostcode {
  new(options: { oncomplete: (data: DaumPostcodeData) => void }): { open: () => void };
}

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcode;
    };
  }
}

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import AuthGuard from './AuthGuard'
import styles from './SignupPage.module.css'

interface CategoryOption {
  id: string
  name: string
  icon: string
}

const categories: CategoryOption[] = [
  { id: 'dessert', name: '디저트 박스', icon: '/icons/dessert_box.png' },
  { id: 'sandwich', name: '샌드위치/베이커리', icon: '/icons/sandwich_bakery.png' },
  { id: 'salad', name: '샐러드/과일', icon: '/icons/salad_fruit.png' },
  { id: 'kimbap', name: '김밥/한식', icon: '/icons/kimbap_korean.png' },
  { id: 'traditional', name: '떡/전통한과/건과류', icon: '/icons/ricecake_traditional.png' }
]

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
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [formData, setFormData] = useState({
    categories: [] as string[],
    storeName: '',
    businessRegistration: '',
    businessOwner: '',
    businessRegistrationImage: '',
    address: '',
    detailAddress: ''
  })
  const [error, setError] = useState('')
  const [isPostcodeLoaded, setIsPostcodeLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    // Step 1 데이터 확인
    const savedData = sessionStorage.getItem('partnerSignupStep1')
    if (!savedData) {
      router.push('/signup/partner/step1')
      return
    }
    setStep1Data(JSON.parse(savedData))
  }, [router])

  useEffect(() => {
    // 카카오 API가 이미 로드되어 있는지 확인
    const checkKakaoAPI = () => {
      if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
        setIsPostcodeLoaded(true);
        console.log('Kakao Postcode API already loaded');
      }
    };

    // 페이지 로드 후 체크
    checkKakaoAPI();

    // 일정 시간 후에도 체크 (스크립트 로딩 지연 대비)
    const timer = setTimeout(checkKakaoAPI, 1000);

    return () => clearTimeout(timer);
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCategorySelect = (categoryId: string) => {
    const currentCategories = formData.categories

    if (currentCategories.includes(categoryId)) {
      // 이미 선택된 카테고리면 해제
      setFormData({
        ...formData,
        categories: currentCategories.filter(id => id !== categoryId)
      })
    } else if (currentCategories.length < 2) {
      // 최대 2개까지만 선택 가능
      setFormData({
        ...formData,
        categories: [...currentCategories, categoryId]
      })
    }
  }

  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data: DaumPostcodeData) {
          const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;

          setFormData({
            ...formData,
            address: addr
          });
        }
      }).open();
    } else {
      console.log('Kakao Postcode API not loaded yet');
      alert('주소 검색 서비스를 로딩 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }

  const handlePostcodeLoad = () => {
    setIsPostcodeLoaded(true);
    console.log('Kakao Postcode API loaded successfully');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // 사업자 정보 검증
    const validationError =
      formData.categories.length === 0 ? '가게업종분류를 선택해주세요.' :
      !formData.storeName ? '가게명을 입력해주세요.' :
      !formData.businessRegistration ? '사업자등록번호를 입력해주세요.' :
      !formData.businessOwner ? '사업자 대표이름을 입력해주세요.' :
      !formData.address ? '가게 주소를 입력해주세요.' :
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
      // Step3에서 사용할 모든 데이터를 세션 스토리지에 저장 (회원가입은 Step3에서 진행)
      const allSignupData = {
        email: step1Data.email,
        password: step1Data.password || '', // 소셜 사용자는 비밀번호 없음
        name: step1Data.name,
        phone: step1Data.phone,
        companyName: formData.storeName,
        type: 'partner' as const,
        termsAgreements: step1Data.termsAgreements,
        // 추가 파트너 정보
        businessCategory: formData.categories[0], // 첫 번째 선택을 대표 업종으로
        businessRegistration: formData.businessRegistration,
        businessRegistrationImage: formData.businessRegistrationImage,
        businessOwner: formData.businessOwner,
        businessAddress: {
          city: formData.address.split(' ')[0] || '',
          district: formData.address.split(' ')[1] || '',
          dong: formData.address.split(' ')[2] || '',
          detail: formData.detailAddress,
          fullAddress: formData.address
        }
      }

      // 모든 회원가입 데이터 저장
      sessionStorage.setItem('partnerSignupData', JSON.stringify(allSignupData))

      // Step3 표시용 데이터 저장
      const step2Data = {
        storeName: formData.storeName,
        category: formData.categories[0],
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
        setError(`데이터 저장 중 오류가 발생했습니다: ${error.message}`)
      } else {
        setError('데이터 저장 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!step1Data) {
    return <div>Loading...</div>
  }

  return (
    <AuthGuard requireAuth={false}>
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
        onLoad={handlePostcodeLoad}
        onError={(e) => {
          console.error('Failed to load Kakao Postcode API:', e);
        }}
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
              {/* 가게업종분류 */}
              <div className={styles.inputGroup}>
                <label className={styles.categoryTitle}>
                  가게업종선택
                </label>
                <p className={styles.categoryDescription}>
                  파트너님의 가게 업종을 선택해주세요.<br />
                  최대 2개 까지 선택가능하며, <span className={styles.categoryHighlight}>최초 1개가 대표업종</span>으로 선택됩니다.
                </p>
                <div className={styles.categoryGrid}>
                  <div className={styles.categoryRowTop}>
                    {categories.slice(0, 3).map((category) => {
                      const isSelected = formData.categories.includes(category.id)
                      const isFirstSelection = formData.categories[0] === category.id

                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={`${styles.categoryCard} ${isSelected ? styles.selected : ''}`}
                          onClick={() => handleCategorySelect(category.id)}
                        >
                          {isFirstSelection && (
                            <div className={styles.representativeLabel}>대표</div>
                          )}
                          <div className={styles.categoryIcon}>
                            <Image
                              src={category.icon}
                              alt={category.name}
                              width={32}
                              height={32}
                            />
                          </div>
                          <div className={styles.categoryName}>{category.name}</div>
                        </button>
                      )
                    })}
                  </div>
                  <div className={styles.categoryRowBottom}>
                    {categories.slice(3, 5).map((category) => {
                      const isSelected = formData.categories.includes(category.id)
                      const isFirstSelection = formData.categories[0] === category.id

                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={`${styles.categoryCard} ${isSelected ? styles.selected : ''}`}
                          onClick={() => handleCategorySelect(category.id)}
                        >
                          {isFirstSelection && (
                            <div className={styles.representativeLabel}>대표</div>
                          )}
                          <div className={styles.categoryIcon}>
                            <Image
                              src={category.icon}
                              alt={category.name}
                              width={32}
                              height={32}
                            />
                          </div>
                          <div className={styles.categoryName}>{category.name}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 가게명 */}
              <div className={styles.inputGroup}>
                <label htmlFor="storeName" className={styles.label}>
                  가게명
                </label>
                <input
                  id="storeName"
                  name="storeName"
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={handleChange}
                  className={styles.inputNoIcon}
                  placeholder="가게명을 입력해주세요"
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

              {/* 가게 주소 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  가게 주소
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
                    onClick={handleAddressSearch}
                    className={styles.addressSearchButton}
                    disabled={!isPostcodeLoaded}
                  >
                    {isPostcodeLoaded ? '주소 검색' : '로딩 중...'}
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
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}