'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import AddressSearchModal from '@/components/common/AddressSearchModal'
import styles from './StoreRegister.module.css'

export default function StoreRegister() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')

  const [formData, setFormData] = useState({
    storeName: '',
    businessRegistration: '',
    businessOwner: '',
    businessPhone: '',
    businessRegistrationImage: '',
    address: '',
    detailAddress: ''
  })

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    // 이미 store가 등록되어 있는지 확인
    const checkExistingStore = async () => {
      try {
        const storeDoc = await getDoc(doc(db, 'stores', user.uid))
        if (storeDoc.exists()) {
          // 이미 등록된 경우 관리 페이지로 이동
          router.push('/partner/store/management')
          return
        }

        // users 문서에서 기존 정보 가져오기
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setFormData(prev => ({
            ...prev,
            businessPhone: userData.phone || ''
          }))
        }
      } catch (error) {
        console.error('Error checking store:', error)
      } finally {
        setLoading(false)
      }
    }

    checkExistingStore()
  }, [user, authLoading, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 크기는 5MB 이하여야 합니다.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const formDataToUpload = new FormData()
      formDataToUpload.append('file', file)
      formDataToUpload.append('type', 'business-registration')

      if (user.email) {
        const sanitizedEmail = user.email.replace(/[@.]/g, '_')
        formDataToUpload.append('userId', sanitizedEmail)
      } else {
        formDataToUpload.append('userId', user.uid)
      }

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
    if (!user) return

    setError('')
    setIsSubmitting(true)

    // 검증
    const validationError =
      !formData.storeName ? '판매자명을 입력해주세요.' :
      !formData.businessRegistration ? '사업자등록번호를 입력해주세요.' :
      !formData.businessOwner ? '사업자 대표이름을 입력해주세요.' :
      !formData.address ? '판매자 주소를 입력해주세요.' :
      null

    if (validationError) {
      setError(validationError)
      setIsSubmitting(false)
      return
    }

    try {
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
          }
        }
      } catch (geocodeError) {
        console.error('Geocoding API 호출 오류:', geocodeError)
      }

      // users 문서에서 전화번호 가져오기
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.exists() ? userDoc.data() : {}

      // stores 컬렉션에 가게 정보 저장 (문서 ID = user.uid)
      const storeData = {
        partnerId: user.uid,
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
        phone: userData.phone || formData.businessPhone,
        description: '',
        closedDays: [],
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // stores 문서 생성 (문서 ID = user.uid)
      await setDoc(doc(db, 'stores', user.uid), storeData)

      // users 컬렉션 업데이트 - 회원가입 완료 처리
      await setDoc(doc(db, 'users', user.uid), {
        registrationComplete: true,
        updatedAt: serverTimestamp()
      }, { merge: true })

      alert('판매자 등록이 완료되었습니다.')
      router.push('/partner/store/management')
    } catch (error) {
      console.error('Store registration error:', error)
      setError('판매자 등록 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <AddressSearchModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onComplete={handleAddressComplete}
      />

      <div className={styles.formCard}>
        <h1 className={styles.title}>판매자 등록</h1>
        <p className={styles.subtitle}>사업자 정보를 입력해주세요</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* 판매자명 */}
          <div className={styles.inputGroup}>
            <label htmlFor="storeName" className={styles.label}>
              판매자명 <span className={styles.required}>*</span>
            </label>
            <input
              id="storeName"
              name="storeName"
              type="text"
              required
              value={formData.storeName}
              onChange={handleChange}
              className={styles.input}
              placeholder="판매자명을 입력해주세요"
            />
          </div>

          {/* 사업자등록번호 */}
          <div className={styles.inputGroup}>
            <label htmlFor="businessRegistration" className={styles.label}>
              사업자등록번호 <span className={styles.required}>*</span>
            </label>
            <input
              id="businessRegistration"
              name="businessRegistration"
              type="text"
              required
              value={formData.businessRegistration}
              onChange={handleChange}
              className={styles.input}
              placeholder="사업자등록번호를 입력해주세요"
            />
          </div>

          {/* 사업자 대표이름 */}
          <div className={styles.inputGroup}>
            <label htmlFor="businessOwner" className={styles.label}>
              사업자 대표이름 <span className={styles.required}>*</span>
            </label>
            <input
              id="businessOwner"
              name="businessOwner"
              type="text"
              required
              value={formData.businessOwner}
              onChange={handleChange}
              className={styles.input}
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
              value={formData.businessPhone}
              onChange={handleChange}
              className={styles.input}
              placeholder="판매자 대표전화를 입력해주세요"
            />
          </div>

          {/* 사업자 등록증 이미지 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              사업자 등록증 이미지
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
              판매자 주소 <span className={styles.required}>*</span>
            </label>
            <div className={styles.addressContainer}>
              <input
                name="address"
                type="text"
                value={formData.address}
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
              className={styles.input}
              placeholder="상세주소를 입력해주세요"
              style={{ marginTop: '10px' }}
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? '등록 중...' : '판매자 등록'}
          </button>

          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.back()}
          >
            취소
          </button>
        </form>
      </div>
    </div>
  )
}
