'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './AddRestaurantPage.module.css'

interface RestaurantData {
  category: string
  name: string
  location: string
  phone: string
  website?: string
  imageUrl?: string
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

export default function AddRestaurantPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<RestaurantData>({
    category: '',
    name: '',
    location: '',
    phone: '',
    website: ''
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Upload API error:', response.status, errorData)
      throw new Error(`이미지 업로드 실패: ${errorData.error || response.statusText}`)
    }

    const result = await response.json()
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
      let imageUrl = ''
      if (selectedImage) {
        console.log('이미지 업로드 중...')
        imageUrl = await uploadImage(selectedImage)
        console.log('이미지 업로드 완료:', imageUrl)
      }

      const restaurantId = Date.now().toString()
      const restaurantData = {
        ...formData,
        imageUrl,
        id: restaurantId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      console.log('업체 정보 저장 중...', restaurantData)
      await setDoc(doc(db, 'restaurants', restaurantId), restaurantData)

      alert('업체가 성공적으로 추가되었습니다!')

      // 폼 초기화
      setFormData({
        category: '',
        name: '',
        location: '',
        phone: '',
        website: ''
      })
      setSelectedImage(null)
      setImagePreview('')

      // 현재 페이지에 유지 (router.push 제거)
    } catch (error) {
      console.error('업체 추가 오류:', error)
      setError('업체 추가 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>업체추가를 추가해주세요</h1>

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

          {/* 6. 매장 대표사진 추가 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>6. 매장 대표사진 추가</label>
            <div className={styles.imageUploadContainer}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
                id="imageUpload"
              />
              <label htmlFor="imageUpload" className={styles.fileLabel}>
                {imagePreview ? '사진 변경' : '파일을 선택해주세요'}
              </label>
              <label htmlFor="imageUpload" className={styles.uploadButton}>
                파일업로드
              </label>
            </div>
            {imagePreview && (
              <div className={styles.imagePreview}>
                <Image src={imagePreview} alt="미리보기" className={styles.previewImage} width={200} height={200} />
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
              {isLoading ? '업체등록하기...' : '업체등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}