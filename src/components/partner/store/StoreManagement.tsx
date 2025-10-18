'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Script from 'next/script'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { DaumPostcodeData } from '@/components/payments/types'
import styles from './StoreManagement.module.css'

interface StoreInfo {
  partnerId: string
  storeName: string
  businessRegistration: string
  businessRegistrationImage: string
  businessOwner: string
  address: {
    city: string
    district: string
    dong: string
    detail: string
    fullAddress: string
  }
  phone: string
  description: string
  openingHours: string
  closedDays: string[]
  status: 'pending' | 'active' | 'inactive'
  storeImages?: string[]
}

export default function StoreManagement() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [originalStoreInfo, setOriginalStoreInfo] = useState<StoreInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // 임시 이미지 상태 (미리보기용)
  const [tempImages, setTempImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [, setHasChanges] = useState(false)
  const [isPostcodeLoaded, setIsPostcodeLoaded] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [modalImageIndex, setModalImageIndex] = useState(0)
  const [showStoreNameInfoModal, setShowStoreNameInfoModal] = useState(false)
  const [mainImageIndex, setMainImageIndex] = useState(0)

  const loadStoreInfo = useCallback(async () => {
    if (!user) return

    try {
      const storeDoc = await getDoc(doc(db, 'stores', user.uid))

      if (storeDoc.exists()) {
        const data = storeDoc.data() as StoreInfo
        setStoreInfo(data)
        setOriginalStoreInfo(data)
      }
    } catch (error) {
      console.error('가게 정보 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/signin')
      return
    }

    loadStoreInfo()
  }, [user, authLoading, router, loadStoreInfo])

  useEffect(() => {
    // 카카오 API가 이미 로드되어 있는지 확인
    const checkKakaoAPI = () => {
      if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
        setIsPostcodeLoaded(true)
      }
    }

    checkKakaoAPI()
    const timer = setTimeout(checkKakaoAPI, 1000)

    return () => clearTimeout(timer)
  }, [])

  // 필드 값 변경 (임시 저장)
  const handleFieldChange = (field: string, value: string) => {
    if (!storeInfo) return

    setStoreInfo({
      ...storeInfo,
      [field]: value
    })
  }

  // 이미지 파일 선택 (미리보기만)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)

    // 미리보기 URL 생성
    const newPreviewUrls = files.map(file => URL.createObjectURL(file))

    setTempImages(prev => [...prev, ...files])
    setPreviewUrls(prev => [...prev, ...newPreviewUrls])
    setHasChanges(true)
  }

  // 미리보기 이미지 삭제
  const handleRemoveTempImage = (index: number) => {
    const existingImagesCount = (storeInfo?.storeImages || []).length
    const actualIndex = existingImagesCount + index

    setTempImages(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      // URL 메모리 해제
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })

    // 대표 이미지 인덱스 조정
    if (mainImageIndex === actualIndex) {
      setMainImageIndex(0) // 삭제된 이미지가 대표였다면 첫 번째로
    } else if (mainImageIndex > actualIndex) {
      setMainImageIndex(mainImageIndex - 1)
    }

    setHasChanges(true)
  }

  // 기존 이미지 삭제 표시
  const handleRemoveExistingImage = (index: number) => {
    if (!storeInfo) return

    const currentImages = storeInfo.storeImages || []
    const newImages = currentImages.filter((_, i) => i !== index)

    setStoreInfo({
      ...storeInfo,
      storeImages: newImages
    })

    // 대표 이미지 인덱스 조정
    if (mainImageIndex === index) {
      setMainImageIndex(0) // 삭제된 이미지가 대표였다면 첫 번째로
    } else if (mainImageIndex > index) {
      setMainImageIndex(mainImageIndex - 1) // 대표 이미지보다 앞의 이미지가 삭제되면 인덱스 감소
    }

    setHasChanges(true)
  }

  // 대표 이미지 인덱스 설정
  const handleSetMainImage = (index: number) => {
    setMainImageIndex(index)
    setHasChanges(true)
  }

  // 전체 적용 버튼 - 모든 변경사항 한 번에 저장
  const handleApplyAllChanges = async () => {
    if (!user || !storeInfo) return

    setUploading(true)

    try {
      let finalImages = [...(storeInfo.storeImages || [])]

      // 새로운 이미지가 있으면 업로드
      if (tempImages.length > 0) {
        const uploadPromises = tempImages.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('type', 'store')
          formData.append('userId', user.uid)

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || '업로드 실패')
          }

          const data = await response.json()
          return data.url
        })

        const uploadedUrls = await Promise.all(uploadPromises)
        finalImages = [...finalImages, ...uploadedUrls]
      }

      // 대표 이미지를 맨 앞으로 이동
      const totalImagesCount = finalImages.length
      if (mainImageIndex > 0 && mainImageIndex < totalImagesCount) {
        const mainImage = finalImages[mainImageIndex]
        finalImages.splice(mainImageIndex, 1)
        finalImages.unshift(mainImage)
      }

      // Firestore에 모든 변경사항 저장
      const storeRef = doc(db, 'stores', user.uid)
      await setDoc(storeRef, {
        ...storeInfo,
        storeImages: finalImages,
        updatedAt: new Date()
      }, { merge: true })

      // 상태 업데이트
      const updatedInfo = {
        ...storeInfo,
        storeImages: finalImages
      }
      setStoreInfo(updatedInfo)
      setOriginalStoreInfo(updatedInfo)

      // 임시 이미지 초기화
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setTempImages([])
      setPreviewUrls([])
      setHasChanges(false)
      setMainImageIndex(0) // 대표 이미지 인덱스 초기화

      alert('가게 정보가 저장되었습니다.')
    } catch (error) {
      console.error('저장 실패:', error)
      alert(`저장에 실패했습니다: ${error}`)
    } finally {
      setUploading(false)
    }
  }

  // 취소 버튼 - 모든 변경사항 되돌리기
  const handleCancelAllChanges = () => {
    // 미리보기 URL 메모리 해제
    previewUrls.forEach(url => URL.revokeObjectURL(url))

    setTempImages([])
    setPreviewUrls([])
    setHasChanges(false)
    setMainImageIndex(0) // 대표 이미지 인덱스 초기화

    // 원래 데이터로 복원
    if (originalStoreInfo) {
      setStoreInfo({ ...originalStoreInfo })
    }
  }

  const handleAddressSearch = () => {
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data: DaumPostcodeData) {
          const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress

          if (storeInfo) {
            setStoreInfo({
              ...storeInfo,
              address: {
                ...storeInfo.address,
                fullAddress: addr,
                city: addr.split(' ')[0] || '',
                district: addr.split(' ')[1] || '',
                dong: addr.split(' ')[2] || ''
              }
            })
            setHasChanges(true)
          }
        }
      }).open()
    } else {
      alert('주소 검색 서비스를 로딩 중입니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const handlePostcodeLoad = () => {
    setIsPostcodeLoaded(true)
  }

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  if (!storeInfo) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>등록된 가게 정보가 없습니다.</p>
          <button
            className={styles.registerButton}
            onClick={() => router.push('/partner/store/register')}
          >
            가게 등록하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
        onLoad={handlePostcodeLoad}
      />

      <div className={styles.header}>
        <h1>가게 관리</h1>
        <button
          className={styles.previewButton}
          onClick={() => setShowPreviewModal(true)}
        >
          미리보기
        </button>
      </div>

      <div className={styles.content}>
        {/* 왼쪽: 편집 영역 */}
        <div className={styles.leftSection}>
          <div className={styles.storeCard}>
          {/* 가게 사진 */}
          <div className={styles.infoSection}>
            <h2 className={styles.sectionTitle}>가게 사진</h2>
            <p className={styles.sectionSubtitle}>
              파트너님의 가게 대표사진을 추가해주세요.{'\n'}
              <span className={styles.boldText}>최소 3장에서 최대 10장</span>까지 가능합니다.
            </p>
            <div className={styles.imageGrid}>
              {/* 기존 이미지 + 미리보기 이미지를 대표 순서로 정렬 */}
              {(() => {
                const existingImages = storeInfo.storeImages || []
                const allImages = [...existingImages, ...previewUrls]

                // 대표 이미지를 맨 앞으로 정렬
                const sortedImages = allImages.map((img, idx) => ({ img, originalIndex: idx }))
                if (mainImageIndex > 0 && mainImageIndex < sortedImages.length) {
                  const mainImg = sortedImages[mainImageIndex]
                  sortedImages.splice(mainImageIndex, 1)
                  sortedImages.unshift(mainImg)
                }

                return sortedImages.map(({ img, originalIndex }, displayIndex) => {
                  const isExisting = originalIndex < existingImages.length
                  const isMainImage = displayIndex === 0
                  const isPreview = !isExisting

                  if (isExisting) {
                    return (
                      <div
                        key={`existing-${originalIndex}`}
                        className={`${styles.imagePreviewBox} ${isMainImage ? styles.mainImage : ''} ${styles.clickableImage}`}
                        onClick={() => handleSetMainImage(originalIndex)}
                      >
                        <img
                          src={img}
                          alt={`가게 사진 ${displayIndex + 1}`}
                          className={styles.previewImage}
                        />
                        {isMainImage && (
                          <div className={styles.mainImageLabel}>대표</div>
                        )}
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveExistingImage(originalIndex)
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  } else {
                    const previewIndex = originalIndex - existingImages.length
                    return (
                      <div
                        key={`preview-${previewIndex}`}
                        className={`${styles.imagePreviewBox} ${isMainImage ? styles.mainImage : ''} ${styles.clickableImage}`}
                        onClick={() => handleSetMainImage(originalIndex)}
                      >
                        <img
                          src={img}
                          alt={`미리보기 ${displayIndex + 1}`}
                          className={styles.previewImage}
                        />
                        {isMainImage && (
                          <div className={styles.mainImageLabel}>대표</div>
                        )}
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveTempImage(previewIndex)
                          }}
                        >
                          ✕
                        </button>
                        <div className={styles.previewBadge}>미리보기</div>
                      </div>
                    )
                  }
                })
              })()}

              {/* 이미지 추가 버튼 */}
              <label className={styles.addImageButton}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  disabled={uploading}
                  className={styles.fileInput}
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H12M12 12H19M12 12V5M12 12V19" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </label>
            </div>
          </div>

          {/* 가게명과 가게 대표 전화 */}
          <div className={styles.infoRow}>
            <div className={styles.infoSection}>
              <h2 className={styles.sectionTitle}>
                가게명
                <button
                  type="button"
                  className={styles.infoIconButton}
                  onClick={() => setShowStoreNameInfoModal(true)}
                >
                  <Image src="/icons/info.svg" alt="info" width={16} height={16} />
                </button>
              </h2>
              <input
                type="text"
                value={storeInfo.storeName}
                className={styles.readOnlyInput}
                readOnly
              />
            </div>

            <div className={styles.infoSection}>
              <h2 className={styles.sectionTitle}>가게 대표 전화</h2>
              <input
                type="tel"
                value={storeInfo.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className={styles.editInput}
                placeholder="전화번호를 입력해주세요"
              />
            </div>
          </div>

          {/* 가게 위치 */}
          <div className={styles.infoSection}>
            <h2 className={styles.sectionTitle}>가게 위치</h2>
            <div className={styles.addressContainer}>
              <input
                type="text"
                value={storeInfo.address.fullAddress}
                readOnly
                className={styles.addressInput}
                placeholder="주소 검색을 클릭해주세요"
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
              type="text"
              value={storeInfo.address.detail}
              onChange={(e) => {
                setStoreInfo({
                  ...storeInfo,
                  address: {
                    ...storeInfo.address,
                    detail: e.target.value
                  }
                })
                setHasChanges(true)
              }}
              className={styles.editInput}
              placeholder="상세주소를 입력해주세요"
              style={{ marginTop: '10px' }}
            />
          </div>

          {/* 가게 휴무일 */}
          <div className={styles.infoSection}>
            <h2 className={styles.sectionTitle}>가게 휴무일</h2>
            <input
              type="text"
              defaultValue={storeInfo.closedDays?.join(', ') || ''}
              onBlur={(e) => {
                const value = e.target.value
                const days = value.split(',').map(d => d.trim()).filter(d => d)
                setStoreInfo({
                  ...storeInfo,
                  closedDays: days
                })
                setHasChanges(true)
              }}
              className={styles.editInput}
              placeholder="휴무일을 입력해주세요 (예: 월요일, 화요일)"
            />
          </div>
          </div>

          {/* 하단 적용/취소 버튼 - 항상 표시 */}
          <div className={styles.bottomActions}>
            <button
              onClick={handleCancelAllChanges}
              className={styles.bottomCancelButton}
              disabled={uploading}
            >
              취소
            </button>
            <button
              onClick={handleApplyAllChanges}
              className={styles.bottomApplyButton}
              disabled={uploading}
            >
              {uploading ? '저장 중...' : '적용'}
            </button>
          </div>
        </div>

        {/* 오른쪽: 미리보기 영역 */}
        <div className={styles.rightSection}>
          <div className={styles.previewHeader}>미리보기</div>
          <div className={styles.previewCard}>
            {/* 가게 대표사진 슬라이더 */}
            {((storeInfo.storeImages && storeInfo.storeImages.length > 0) || previewUrls.length > 0) ? (
              <>
                {(() => {
                  const existingImages = storeInfo.storeImages || []
                  const allImages = [...existingImages, ...previewUrls]

                  // 대표 이미지를 맨 앞으로 정렬
                  const sortedImages = [...allImages]
                  if (mainImageIndex > 0 && mainImageIndex < sortedImages.length) {
                    const mainImg = sortedImages[mainImageIndex]
                    sortedImages.splice(mainImageIndex, 1)
                    sortedImages.unshift(mainImg)
                  }

                  const totalImages = sortedImages.length

                  return (
                    <div className={styles.previewImageSlider}>
                      <div className={styles.previewImage}>
                        <img
                          src={sortedImages[currentImageIndex]}
                          alt={`가게 사진 ${currentImageIndex + 1}`}
                          className={styles.previewMainImage}
                        />
                      </div>

                      {totalImages > 1 && (
                        <>
                          {/* 좌우 화살표 */}
                          <button
                            className={`${styles.sliderArrow} ${styles.sliderArrowLeft}`}
                            onClick={() => setCurrentImageIndex(prev => prev === 0 ? totalImages - 1 : prev - 1)}
                          >
                            ‹
                          </button>
                          <button
                            className={`${styles.sliderArrow} ${styles.sliderArrowRight}`}
                            onClick={() => setCurrentImageIndex(prev => prev === totalImages - 1 ? 0 : prev + 1)}
                          >
                            ›
                          </button>

                          {/* 페이지 인디케이터 */}
                          <div className={styles.sliderIndicators}>
                            {sortedImages.map((_, index) => (
                              <button
                                key={index}
                                className={`${styles.indicator} ${index === currentImageIndex ? styles.indicatorActive : ''}`}
                                onClick={() => setCurrentImageIndex(index)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}
              </>
            ) : (
              <div className={styles.previewImagePlaceholder}>
                이미지 추가
              </div>
            )}

            {/* 가게 정보 */}
            <div className={styles.previewInfo}>
              <div className={styles.previewStoreName}>
                {storeInfo.storeName || '가게명'}
              </div>
              <div className={styles.previewRating}>
                <Image src="/icons/star.png" alt="star" width={16} height={16} style={{ width: '16px', height: 'auto' }} />
                <span className={styles.ratingScore}>0/5</span>
                <span className={styles.ratingCount}>(0)</span>
              </div>
            </div>

            <div className={styles.previewDetails}>
              <h3 className={styles.previewDetailsTitle}>가게 정보</h3>
              <div className={styles.previewDetailItem}>
                <span className={styles.previewLabel}>전화</span>
                <span className={styles.previewValue}>{storeInfo.phone || '02-1234-5678'}</span>
              </div>
              <div className={styles.previewDetailItem}>
                <span className={styles.previewLabel}>가게위치</span>
                <div className={styles.previewValueColumn}>
                  <span className={styles.previewValue}>{storeInfo.address.fullAddress}</span>
                  <span className={styles.previewValue}>{storeInfo.address.detail}</span>
                </div>
              </div>
              <div className={styles.previewDetailItem}>
                <span className={styles.previewLabel}>휴무일</span>
                <span className={styles.previewValue}>
                  {storeInfo.closedDays?.length > 0
                    ? storeInfo.closedDays.join(', ')
                    : '매주 월요일'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 미리보기 모달 */}
      {showPreviewModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPreviewModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>미리보기</h2>
              <button
                className={styles.modalCloseButton}
                onClick={() => setShowPreviewModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.previewCard}>
              {/* 가게 대표사진 슬라이더 */}
              {((storeInfo.storeImages && storeInfo.storeImages.length > 0) || previewUrls.length > 0) ? (
                <>
                  {(() => {
                    const existingImages = storeInfo.storeImages || []
                    const allImages = [...existingImages, ...previewUrls]

                    // 대표 이미지를 맨 앞으로 정렬
                    const sortedImages = [...allImages]
                    if (mainImageIndex > 0 && mainImageIndex < sortedImages.length) {
                      const mainImg = sortedImages[mainImageIndex]
                      sortedImages.splice(mainImageIndex, 1)
                      sortedImages.unshift(mainImg)
                    }

                    const totalImages = sortedImages.length

                    return (
                      <div className={styles.previewImageSlider}>
                        <div className={styles.previewImage}>
                          <img
                            src={sortedImages[modalImageIndex]}
                            alt={`가게 사진 ${modalImageIndex + 1}`}
                            className={styles.previewMainImage}
                          />
                        </div>

                        {totalImages > 1 && (
                          <>
                            {/* 좌우 화살표 */}
                            <button
                              className={`${styles.sliderArrow} ${styles.sliderArrowLeft}`}
                              onClick={() => setModalImageIndex(prev => prev === 0 ? totalImages - 1 : prev - 1)}
                            >
                              ‹
                            </button>
                            <button
                              className={`${styles.sliderArrow} ${styles.sliderArrowRight}`}
                              onClick={() => setModalImageIndex(prev => prev === totalImages - 1 ? 0 : prev + 1)}
                            >
                              ›
                            </button>

                            {/* 페이지 인디케이터 */}
                            <div className={styles.sliderIndicators}>
                              {sortedImages.map((_, index) => (
                                <button
                                  key={index}
                                  className={`${styles.indicator} ${index === modalImageIndex ? styles.indicatorActive : ''}`}
                                  onClick={() => setModalImageIndex(index)}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })()}
                </>
              ) : (
                <div className={styles.previewImagePlaceholder}>
                  이미지 추가
                </div>
              )}

              {/* 가게 정보 */}
              <div className={styles.previewInfo}>
                <div className={styles.previewStoreName}>
                  {storeInfo.storeName || '가게명'}
                </div>
                <div className={styles.previewRating}>
                  <Image src="/icons/star.png" alt="star" width={16} height={16} />
                  <span className={styles.ratingScore}>0/5</span>
                  <span className={styles.ratingCount}>(0)</span>
                </div>
              </div>

              <div className={styles.previewDetails}>
                <h3 className={styles.previewDetailsTitle}>가게 정보</h3>
                <div className={styles.previewDetailItem}>
                  <span className={styles.previewLabel}>전화</span>
                  <span className={styles.previewValue}>{storeInfo.phone || '02-1234-5678'}</span>
                </div>
                <div className={styles.previewDetailItem}>
                  <span className={styles.previewLabel}>가게위치</span>
                  <div className={styles.previewValueColumn}>
                    <span className={styles.previewValue}>{storeInfo.address.fullAddress}</span>
                    <span className={styles.previewValue}>{storeInfo.address.detail}</span>
                  </div>
                </div>
                <div className={styles.previewDetailItem}>
                  <span className={styles.previewLabel}>휴무일</span>
                  <span className={styles.previewValue}>
                    {storeInfo.closedDays?.length > 0
                      ? storeInfo.closedDays.join(', ')
                      : '매주 월요일'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 가게명 변경 안내 모달 */}
      {showStoreNameInfoModal && (
        <div className={styles.infoModalOverlay} onClick={() => setShowStoreNameInfoModal(false)}>
          <div className={styles.infoModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoModalHeader}>
              <h3 className={styles.infoModalTitle}>가게명 변경안내</h3>
              <button
                className={styles.infoModalCloseButton}
                onClick={() => setShowStoreNameInfoModal(false)}
              >
                ✕
              </button>
            </div>
            <p className={styles.infoModalText}>
              가게명 변경은 사업자 등록 확인을 위해 고객센터를 통해 진행되며, 요청 후 본사 검수 후 변경까지 영업일 기준 1~2일 소요될 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
