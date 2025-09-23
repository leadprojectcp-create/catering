'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './AddRestaurantPage.module.css'

interface RestaurantData {
  category: string
  name: string
  location: string
  phone: string
  website?: string
  imageUrl?: string
  businessHours?: string
}

const categories = [
  { value: '케이터링 박스 / 플래터', label: '케이터링 박스 / 플래터' },
  { value: '샌드위치 / 베이커리', label: '샌드위치 / 베이커리' },
  { value: '디저트 박스', label: '디저트 박스' },
  { value: '김밥 / 한식 도시락', label: '김밥 / 한식 도시락' },
  { value: '샐러드 / 과일 도시락', label: '샐러드 / 과일 도시락' },
  { value: '음료 / 커피 / 차', label: '음료 / 커피 / 차' },
  { value: '떡 / 전통한과 / 견과류', label: '떡 / 전통한과 / 견과류' }
]

interface EditRestaurantPageProps {
  restaurantId: string
}

export default function EditRestaurantPage({ restaurantId }: EditRestaurantPageProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<RestaurantData>({
    category: '',
    name: '',
    location: '',
    phone: '',
    website: '',
    businessHours: ''
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('')
  const [imageDeleted, setImageDeleted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDataLoading, setIsDataLoading] = useState(true)

  // 기존 데이터 로드
  useEffect(() => {
    const loadRestaurantData = async () => {
      try {
        const docRef = doc(db, 'restaurants', restaurantId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setFormData({
            category: data.category || '',
            name: data.name || '',
            location: data.location || '',
            phone: data.phone || '',
            website: data.website || '',
            businessHours: data.businessHours || ''
          })
          if (data.imageUrl) {
            setImagePreview(data.imageUrl)
            setOriginalImageUrl(data.imageUrl)
          }
        } else {
          setError('업체 정보를 찾을 수 없습니다.')
        }
      } catch (error) {
        console.error('데이터 로드 오류:', error)
        setError('데이터 로드 중 오류가 발생했습니다.')
      } finally {
        setIsDataLoading(false)
      }
    }

    loadRestaurantData()
  }, [restaurantId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setImageDeleted(false)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageDelete = () => {
    setSelectedImage(null)
    setImagePreview('')
    setImageDeleted(true)
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    console.log('Uploading image:', file.name, file.size, 'bytes')

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formDataUpload
    })

    console.log('Upload response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Upload API error:', response.status, response.statusText, errorData)

      let errorMessage = `이미지 업로드 실패 (${response.status})`
      if (errorData.error) {
        errorMessage += `: ${errorData.error}`
      }
      if (errorData.details) {
        console.error('Upload error details:', errorData.details)
        errorMessage += ` [환경설정 문제 가능성]`
      }

      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('Upload result:', result)
    return result.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const validationError =
      !formData.category ? '카테고리를 선택해주세요.' :
      !formData.name ? '가게명을 입력해주세요.' :
      !formData.location ? '가게위치를 입력해주세요.' :
      !formData.phone ? '전화번호를 입력해주세요.' :
      null

    if (validationError) {
      setError(validationError)
      setIsLoading(false)
      return
    }

    try {
      let imageUrl = imagePreview // 기존 이미지 URL 유지

      // 이미지가 삭제된 경우
      if (imageDeleted) {
        imageUrl = ''
      }
      // 새 이미지가 선택된 경우에만 업로드
      else if (selectedImage) {
        console.log('새 이미지 업로드 중...')
        imageUrl = await uploadImage(selectedImage)
        console.log('이미지 업로드 완료:', imageUrl)
      }

      const restaurantData = {
        ...formData,
        imageUrl,
        id: restaurantId,
        updatedAt: new Date()
      }

      console.log('업체 정보 수정 중...', restaurantData)
      await setDoc(doc(db, 'restaurants', restaurantId), restaurantData, { merge: true })

      alert('업체 정보가 성공적으로 수정되었습니다!')
      router.push('/')  // 메인 페이지로 이동
    } catch (error) {
      console.error('업체 수정 오류:', error)
      setError('업체 수정 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isDataLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className="text-center">데이터 로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>업체 정보 수정</h1>

            <form className={styles.form} onSubmit={handleSubmit}>
              {/* 1. 카테고리 선택 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>1. 카테고리 선택</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={styles.select}
                  required
                >
                  <option value="">카테고리를 선택해주세요</option>
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. 가게명 입력 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>2. 가게명 입력</label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="가게명을 입력해주세요"
                  required
                />
              </div>

              {/* 3. 가게위치 입력 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>3. 가게위치 입력</label>
                <input
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="가게위치를 입력해주세요"
                  required
                />
              </div>

              {/* 4. 대표 전화번호 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>4. 대표 전화번호</label>
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="전화번호를 입력해주세요"
                  required
                />
              </div>

              {/* 5. 매장 홈페이지 주소 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>5. 매장 홈페이지 주소</label>
                <input
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="https://example.com"
                />
              </div>

              {/* 6. 영업시간 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>6. 영업시간</label>
                <textarea
                  name="businessHours"
                  value={formData.businessHours}
                  onChange={handleChange}
                  className={styles.textarea}
                  placeholder="예: 평일 09:00-18:00, 토요일 09:00-15:00, 일요일 휴무"
                  rows={3}
                />
              </div>

              {/* 7. 매장 대표사진 수정 */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>7. 매장 대표사진 수정</label>
                <div className={styles.imageUploadContainer}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className={styles.fileInput}
                    id="imageUpload"
                  />
                  <label htmlFor="imageUpload" className={styles.fileLabel}>
                    {selectedImage ? '새 사진 선택됨' : '새 사진 선택하기'}
                  </label>
                  <label htmlFor="imageUpload" className={styles.uploadButton}>
                    사진변경
                  </label>
                  {(imagePreview || originalImageUrl) && !imageDeleted && (
                    <button
                      type="button"
                      onClick={handleImageDelete}
                      className={styles.deleteButton}
                    >
                      사진삭제
                    </button>
                  )}
                </div>
                {imagePreview && !imageDeleted && (
                  <div className={styles.imagePreview}>
                    <Image src={imagePreview} alt="미리보기" className={styles.previewImage} width={200} height={200} />
                  </div>
                )}
                {imageDeleted && (
                  <div className={styles.imagePreview}>
                    <div className="text-center text-gray-500 py-8">
                      사진이 삭제되었습니다.
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}

              <div className={styles.buttonContainer}>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className={styles.cancelButton}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={styles.submitButton}
                >
                  {isLoading ? '수정 중...' : '수정 완료'}
                </button>
              </div>
            </form>
      </div>
    </div>
  )
}