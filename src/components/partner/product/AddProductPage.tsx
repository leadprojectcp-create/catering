'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createProduct } from '@/lib/services/productService'
import { useAuth } from '@/contexts/AuthContext'
import styles from './AddProductPage.module.css'

interface OptionValue {
  name: string
  price: number
}

interface ProductOption {
  groupName: string
  values: OptionValue[]
}

interface ProductFormData {
  name: string
  images: File[]
  price: number
  options: ProductOption[]
  description: string
  minOrderQuantity: number
  maxOrderQuantity: number
  deliveryMethods: {
    self: boolean
    quick: boolean
    pickup: boolean
  }
  additionalSettings: {
    sameDayDelivery: boolean
    thermalPack: boolean
    stickerCustom: boolean
    giftItem: boolean
  }
  origin: { ingredient: string, origin: string }[]
  discount?: {
    enabled: boolean
    type: 'amount' | 'percent'
    value: number
    startDate: string | null
    endDate: string | null
    isAlwaysActive: boolean
  }
}

export default function AddProductPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [hasSavedData, setHasSavedData] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectingDate, setSelectingDate] = useState<'start' | 'end'>('start')
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    images: [],
    price: 0,
    options: [{ groupName: '', values: [{ name: '', price: 0 }] }],
    description: '',
    minOrderQuantity: 10,
    maxOrderQuantity: 11,
    deliveryMethods: {
      self: false,
      quick: false,
      pickup: false
    },
    additionalSettings: {
      sameDayDelivery: false,
      thermalPack: false,
      stickerCustom: false,
      giftItem: false
    },
    origin: [],
    discount: {
      enabled: false,
      type: 'percent',
      value: 0,
      startDate: null,
      endDate: null,
      isAlwaysActive: true
    }
  })

  // Format number with commas
  const formatNumberWithCommas = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // Parse formatted number string to number
  const parseFormattedNumber = (str: string): number => {
    return Number(str.replace(/,/g, '')) || 0
  }

  // 할인 계산
  const calculateDiscountedPrice = () => {
    if (!formData.discount?.enabled || !formData.discount.value) return formData.price

    if (formData.discount.type === 'amount') {
      return Math.max(0, formData.price - formData.discount.value)
    } else {
      return Math.max(0, formData.price * (1 - formData.discount.value / 100))
    }
  }

  const calculateDiscountPercent = () => {
    if (!formData.discount?.enabled || !formData.discount.value) return 0

    if (formData.discount.type === 'percent') {
      return formData.discount.value
    } else {
      return Math.round((formData.discount.value / formData.price) * 100)
    }
  }

  // 달력 관련 함수들
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth, year, month }
  }

  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const formattedDate = formatDateToYYYYMMDD(selectedDate)

    if (selectingDate === 'start') {
      setFormData(prev => ({
        ...prev,
        discount: { ...prev.discount!, startDate: formattedDate }
      }))
      setSelectingDate('end')
    } else {
      setFormData(prev => ({
        ...prev,
        discount: { ...prev.discount!, endDate: formattedDate }
      }))
      setShowCalendar(false)
    }
  }

  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + direction)
    setCurrentMonth(newMonth)
  }

  const renderCalendar = () => {
    const monthData = getDaysInMonth(currentMonth)
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < monthData.firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.calendarDay}></div>)
    }

    // Days of the month
    for (let day = 1; day <= monthData.daysInMonth; day++) {
      const currentDate = formatDateToYYYYMMDD(new Date(monthData.year, monthData.month, day))
      const isSelected = currentDate === formData.discount?.startDate || currentDate === formData.discount?.endDate
      const isInRange = formData.discount?.startDate && formData.discount?.endDate &&
                        currentDate > formData.discount.startDate && currentDate < formData.discount.endDate

      days.push(
        <div
          key={day}
          className={`${styles.calendarDay} ${isSelected ? styles.calendarDaySelected : ''} ${isInRange ? styles.calendarDayInRange : ''}`}
          onClick={() => handleDateSelect(day)}
        >
          {day}
        </div>
      )
    }

    return (
      <div className={styles.calendarDropdown}>
        <div className={styles.calendarHeader}>
          <button type="button" onClick={() => changeMonth(-1)} className={styles.calendarNavButton}>
            ‹
          </button>
          <span className={styles.calendarMonth}>
            {monthData.year}년 {monthData.month + 1}월
          </span>
          <button type="button" onClick={() => changeMonth(1)} className={styles.calendarNavButton}>
            ›
          </button>
        </div>
        <div className={styles.calendarWeekdays}>
          <div>일</div>
          <div>월</div>
          <div>화</div>
          <div>수</div>
          <div>목</div>
          <div>금</div>
          <div>토</div>
        </div>
        <div className={styles.calendarGrid}>
          {days}
        </div>
      </div>
    )
  }

  // Check if there's saved data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('productFormData')
    if (savedData) {
      setHasSavedData(true)
    }
  }, [])

  // Save to local storage
  const handleSaveToLocal = () => {
    // Create a copy of formData without images (can't store File objects in localStorage)
    const dataToSave = {
      ...formData,
      images: [] // Images need to be handled separately
    }
    localStorage.setItem('productFormData', JSON.stringify(dataToSave))
    setHasSavedData(true)
    alert('임시저장되었습니다.')
  }

  // Load from local storage
  const handleLoadFromLocal = () => {
    const savedData = localStorage.getItem('productFormData')
    if (savedData) {
      const parsedData = JSON.parse(savedData)
      setFormData({
        ...parsedData,
        images: formData.images // Keep current images
      })
      // Clear the saved data after loading
      localStorage.removeItem('productFormData')
      setHasSavedData(false)
      alert('임시저장된 데이터를 불러왔습니다.')
    }
  }

  // Handle cancel
  const handleCancel = () => {
    if (confirm('작성중인 내용이 삭제됩니다. 취소하시겠습니까?')) {
      router.back()
    }
  }


  const addOptionGroup = () => {
    setFormData(prev => ({
      ...prev,
      options: [
        ...prev.options,
        { groupName: '', values: [{ name: '', price: 0 }] }
      ]
    }))
  }

  const removeOptionGroup = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const updateOptionGroup = (index: number, groupName: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === index ? { ...option, groupName } : option
      )
    }))
  }

  const addOptionValue = (groupIndex: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === groupIndex
          ? { ...option, values: [...option.values, { name: '', price: 0 }] }
          : option
      )
    }))
  }

  const updateOptionValue = (groupIndex: number, valueIndex: number, field: 'name' | 'price', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === groupIndex
          ? {
              ...option,
              values: option.values.map((val, j) =>
                j === valueIndex
                  ? { ...val, [field]: field === 'price' ? Number(value) : value }
                  : val
              )
            }
          : option
      )
    }))
  }

  const removeOptionValue = (groupIndex: number, valueIndex: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === groupIndex
          ? { ...option, values: option.values.filter((_, j) => j !== valueIndex) }
          : option
      )
    }))
  }

  const addCustomOrigin = () => {
    setFormData(prev => ({
      ...prev,
      origin: [...prev.origin, { ingredient: '', origin: '' }]
    }))
  }

  const updateCustomOrigin = (index: number, field: 'ingredient' | 'origin', value: string) => {
    setFormData(prev => ({
      ...prev,
      origin: prev.origin.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const removeCustomOrigin = (index: number) => {
    setFormData(prev => ({
      ...prev,
      origin: prev.origin.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return // 이미 제출 중이면 무시

    // 인증 확인
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/signin')
      return
    }

    setIsSubmitting(true)

    try {

      // 이미지 업로드 처리
      const uploadedImageUrls: string[] = []

      for (const imageFile of formData.images) {
        const formDataToUpload = new FormData()
        formDataToUpload.append('file', imageFile)
        formDataToUpload.append('type', 'product')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataToUpload
        })

        if (!uploadResponse.ok) {
          throw new Error('이미지 업로드 실패')
        }

        const uploadResult = await uploadResponse.json()
        uploadedImageUrls.push(uploadResult.url)
      }

      // orderType을 'single'로 고정하여 전송
      const submitData: Record<string, unknown> = {
        ...formData,
        images: uploadedImageUrls, // File 객체 대신 업로드된 URL들
        orderType: 'single', // 항상 단건주문으로 설정
        createdAt: new Date().toISOString()
      }

      // 할인이 활성화되어 있으면 할인 데이터 추가
      if (formData.discount?.enabled && formData.discount.value > 0) {
        submitData.discount = {
          type: formData.discount.type,
          value: formData.discount.value,
          startDate: formData.discount.startDate,
          endDate: formData.discount.endDate,
          isAlwaysActive: formData.discount.isAlwaysActive
        }
        submitData.discountedPrice = Math.round(calculateDiscountedPrice())
      }

      // productService를 사용하여 Firestore에 저장
      const productId = await createProduct(submitData)
      alert('상품이 성공적으로 등록되었습니다!')

      // 임시저장 데이터 삭제
      localStorage.removeItem('productFormData')

      // 목록 페이지로 이동
      router.push('/partner/dashboard')

    } catch (error) {
      console.error('상품 등록 중 오류:', error)
      alert(error instanceof Error ? error.message : '상품 등록 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 로딩 중이거나 인증되지 않은 경우 표시
  if (loading) {
    return <div className={styles.container}>로딩 중...</div>
  }

  if (!user) {
    return <div className={styles.container}>로그인이 필요합니다.</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>상품 등록</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
        {/* 상품 이미지 등록 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>1</span>
            <span className={styles.sectionTitle}>상품 이미지 등록</span>
          </div>
          <div className={styles.imageUploadSection}>
            <div className={styles.imageGrid}>
              {/* 이미지 미리보기 */}
              {formData.images.map((file, index) => (
                <div key={index} className={`${styles.imagePreviewBox} ${index === 0 ? styles.mainImage : ''}`}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`상품 이미지 ${index + 1}`}
                    className={styles.previewImage}
                  />
                  {index === 0 && (
                    <div className={styles.mainImageLabel}>대표</div>
                  )}
                  <button
                    type="button"
                    className={styles.removeImageBtn}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        images: prev.images.filter((_, i) => i !== index)
                      }))
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* 이미지 추가 버튼 */}
              <label className={styles.addImageButton}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setFormData(prev => ({
                      ...prev,
                      images: [...prev.images, ...files]
                    }))
                  }}
                  className={styles.fileInput}
                />
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H12M12 12H19M12 12V5M12 12V19" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </label>
            </div>
          </div>
        </div>

        {/* 상품명 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>2</span>
            <span className={styles.sectionTitle}>상품명</span>
          </div>
          <div className={styles.inputWithCounter}>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="상품명을 입력하세요"
              maxLength={100}
              className={styles.textInput}
              required
            />
            <span className={styles.inputCounter}>{formData.name.length}/100자</span>
          </div>
        </div>

        {/* 상품 판매가 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>3</span>
            <span className={styles.sectionTitle}>상품 판매가</span>
          </div>
          <div className={styles.priceInputRow}>
            <div className={`${styles.inputWithUnit} ${styles.priceInputWrapper}`}>
              <input
                type="text"
                value={formData.price ? formatNumberWithCommas(formData.price) : ''}
                onChange={(e) => {
                  const numericValue = parseFormattedNumber(e.target.value)
                  setFormData(prev => ({ ...prev, price: numericValue }))
                }}
                placeholder=""
                className={styles.textInput}
                required
              />
              <span className={styles.inputUnit}>원</span>
            </div>
            <label className={`${styles.checkboxLabel} ${styles.checkboxNoMargin}`} style={{ whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={formData.discount?.enabled || false}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  discount: { ...prev.discount!, enabled: e.target.checked }
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.discount?.enabled ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              할인 적용
            </label>
          </div>

          {/* 할인 설정 영역 */}
          {formData.discount?.enabled && (
            <div className={styles.discountSection}>
              {/* 할인 유형 */}
              <div className={styles.discountInputGroup}>
                <label className={styles.discountLabel}>할인 유형</label>
                <div className={styles.discountTypeButtons}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      discount: { ...prev.discount!, type: 'amount' }
                    }))}
                    className={formData.discount.type === 'amount' ? styles.discountTypeButtonActive : styles.discountTypeButton}
                  >
                    정액할인(원)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      discount: { ...prev.discount!, type: 'percent' }
                    }))}
                    className={formData.discount.type === 'percent' ? styles.discountTypeButtonActive : styles.discountTypeButton}
                  >
                    정률할인(%)
                  </button>
                </div>
              </div>

              {/* 할인 금액/율 */}
              <div className={styles.discountInputGroup}>
                <label className={styles.discountLabel}>
                  {formData.discount.type === 'amount' ? '할인 금액' : '할인율'}
                </label>
                <div className={styles.inputWithUnit}>
                  <input
                    type="number"
                    value={formData.discount.value || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      discount: { ...prev.discount!, value: Number(e.target.value) }
                    }))}
                    placeholder="0"
                    className={styles.textInput}
                  />
                  <span className={styles.inputUnit}>{formData.discount.type === 'amount' ? '원' : '%'}</span>
                </div>
              </div>

              {/* 진행 기간 */}
              <div className={styles.discountInputGroup}>
                <div className={styles.dateRangeHeader}>
                  <label className={`${styles.discountLabel} ${styles.labelNoMargin}`}>진행 기간</label>
                  <label className={`${styles.checkboxLabel} ${styles.checkboxNoMargin}`}>
                    <input
                      type="checkbox"
                      checked={formData.discount.isAlwaysActive}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          discount: {
                            ...prev.discount!,
                            isAlwaysActive: e.target.checked,
                            startDate: e.target.checked ? null : prev.discount!.startDate,
                            endDate: e.target.checked ? null : prev.discount!.endDate
                          }
                        }))
                        setShowCalendar(false)
                      }}
                      className={styles.hiddenCheckbox}
                    />
                    <span className={styles.customCheckbox}>
                      <img
                        src={formData.discount.isAlwaysActive ? "/icons/check_active.png" : "/icons/check.png"}
                        alt="체크박스"
                      />
                    </span>
                    상시 적용
                  </label>
                </div>
                <div className={styles.dateRangeWrapper}>
                  <div className={styles.dateInputContainer}>
                    <input
                      type="text"
                      value={
                        formData.discount.startDate && formData.discount.endDate
                          ? `${formData.discount.startDate.replace(/-/g, '.')} ~ ${formData.discount.endDate.replace(/-/g, '.')}`
                          : formData.discount.startDate
                          ? `${formData.discount.startDate.replace(/-/g, '.')} ~ 종료일 선택`
                          : '기간 선택'
                      }
                      placeholder="기간 선택"
                      className={styles.dateInput}
                      disabled={formData.discount.isAlwaysActive}
                      readOnly
                      onClick={() => {
                        if (!formData.discount.isAlwaysActive) {
                          setShowCalendar(!showCalendar)
                          setSelectingDate('start')
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.calendarButton}
                      disabled={formData.discount.isAlwaysActive}
                      onClick={() => {
                        setShowCalendar(!showCalendar)
                        setSelectingDate('start')
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M6.66667 1.66666V4.16666M13.3333 1.66666V4.16666M2.5 7.49999H17.5M4.16667 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 4.99999V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16667C3.24619 18.3333 2.5 17.5871 2.5 16.6667V4.99999C2.5 4.07952 3.24619 3.33333 4.16667 3.33333Z" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {showCalendar && !formData.discount.isAlwaysActive && renderCalendar()}
                  </div>
                </div>
              </div>

              {/* 할인 적용 결과 */}
              {formData.discount.value > 0 && (
                <div className={styles.discountPreview}>
                  <div className={styles.discountPreviewRow}>
                    <span style={{ color: '#666' }}>원가</span>
                    <span className={styles.discountOriginalPrice}>
                      {formatNumberWithCommas(formData.price)}원
                    </span>
                  </div>
                  <div className={styles.discountPreviewRow}>
                    <span className={styles.discountPriceLabel}>할인가</span>
                    <div style={{ textAlign: 'right' }}>
                      <span className={styles.discountBadge}>
                        {calculateDiscountPercent()}%
                      </span>
                      <span className={styles.discountFinalPrice}>
                        {formatNumberWithCommas(Math.round(calculateDiscountedPrice()))}원
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 상품 수량 설정 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>4</span>
            <span className={styles.sectionTitle}>상품 수량 설정</span>
          </div>
          <div className={styles.quantityGrid}>
            <div className={styles.quantityGroup}>
              <label className={styles.sectionTitle}>최소 수량</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  value={formData.minOrderQuantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, minOrderQuantity: Number(e.target.value) }))}
                  onBlur={(e) => {
                    const value = Number(e.target.value)
                    if (value < 10) {
                      alert('최소 주문수량은 10개 이상이어야 합니다.')
                      setFormData(prev => ({ ...prev, minOrderQuantity: 10 }))
                    }
                  }}
                  min="10"
                  className={styles.textInput}
                />
                <span className={styles.inputUnit}>개</span>
              </div>
            </div>
            <div className={styles.quantityGroup}>
              <label className={styles.sectionTitle}>최대 수량</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  value={formData.maxOrderQuantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxOrderQuantity: Number(e.target.value) }))}
                  min="11"
                  className={styles.textInput}
                />
                <span className={styles.inputUnit}>개</span>
              </div>
            </div>
          </div>
        </div>

        {/* 상품 옵션 설정 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>5</span>
            <span className={styles.sectionTitle}>상품 옵션 설정</span>
          </div>
          {formData.options.map((option, groupIndex) => (
            <div key={groupIndex} className={styles.optionCard}>
              <div className={styles.optionGroupHeader}>
                <label className={styles.optionLabel}>옵션그룹명</label>
                {formData.options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOptionGroup(groupIndex)}
                    className={styles.removeGroupButton}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M9.33464 6.66667V11.3333M6.66797 6.66667V11.3333M4.0013 4V11.8667C4.0013 12.6134 4.0013 12.9865 4.14663 13.2717C4.27446 13.5226 4.47828 13.727 4.72917 13.8548C5.0141 14 5.3873 14 6.13258 14H9.87003C10.6153 14 10.988 14 11.2729 13.8548C11.5238 13.727 11.7283 13.5226 11.8561 13.2717C12.0013 12.9868 12.0013 12.614 12.0013 11.8687V4M4.0013 4H5.33464M4.0013 4H2.66797M5.33464 4H10.668M5.33464 4C5.33464 3.37874 5.33464 3.06827 5.43613 2.82324C5.57145 2.49654 5.83085 2.23682 6.15755 2.10149C6.40258 2 6.71338 2 7.33464 2H8.66797C9.28922 2 9.59985 2 9.84488 2.10149C10.1716 2.23682 10.4311 2.49654 10.5664 2.82324C10.6679 3.06827 10.668 3.37875 10.668 4M10.668 4H12.0013M12.0013 4H13.3346" stroke="#999999" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    옵션 삭제
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="ex) 메인"
                value={option.groupName}
                onChange={(e) => updateOptionGroup(groupIndex, e.target.value)}
                className={styles.textInput}
              />

              <div className={styles.optionValuesContainer}>
                <div className={styles.optionValuesHeader}>
                  <label className={styles.optionLabel}>옵션명</label>
                  <label className={styles.optionLabel}>옵션가격</label>
                </div>
                {option.values.map((value, valueIndex) => (
                  <div key={valueIndex} className={styles.optionValueRow}>
                    <input
                      type="text"
                      placeholder="ex) 참치샌드위치"
                      value={value.name}
                      onChange={(e) => updateOptionValue(groupIndex, valueIndex, 'name', e.target.value)}
                      className={styles.textInput}
                    />
                    <div className={styles.priceInputWrapper}>
                      <input
                        type="text"
                        placeholder="ex) +1,000"
                        value={value.price !== undefined && value.price !== null ? `+${formatNumberWithCommas(value.price)}` : ''}
                        onChange={(e) => {
                          const cleanedValue = e.target.value.replace('+', '').replace(',', '')
                          const numValue = cleanedValue === '' ? 0 : parseFormattedNumber(cleanedValue)
                          updateOptionValue(groupIndex, valueIndex, 'price', numValue)
                        }}
                        className={styles.textInput}
                      />
                      {valueIndex === option.values.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => addOptionValue(groupIndex)}
                          className={styles.addOptionValueButton}
                        >
                          +
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeOptionValue(groupIndex, valueIndex)}
                          className={styles.removeOptionValueButton}
                        >
                          −
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.optionButtonContainer}>
            <button
              type="button"
              onClick={addOptionGroup}
              className={styles.addOptionGroupButton}
            >
              +옵션그룹추가
            </button>
          </div>
        </div>

        {/* 상품설명 작성 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>6</span>
            <span className={styles.sectionTitle}>상품설명 작성</span>
          </div>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="상품에 대한 상세한 설명을 입력하세요"
            rows={10}
            className={styles.textarea}
          />
        </div>

        {/* 원산지 표기 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>7</span>
            <span className={styles.sectionTitle}>원산지 표기</span>
          </div>
          <div className={styles.originContainer}>
            {formData.origin.length === 0 ? (
              <div className={styles.originRow}>
                <input
                  type="text"
                  placeholder="ex) 돼지고기,양배추"
                  className={styles.textInput}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData(prev => ({
                        ...prev,
                        origin: [{ ingredient: e.target.value, origin: '' }]
                      }))
                    }
                  }}
                />
                <div className={styles.originInputWrapper}>
                  <input
                    type="text"
                    placeholder="ex) 국내산"
                    className={styles.textInput}
                    disabled
                  />
                  <button
                    type="button"
                    className={styles.addOriginButton}
                    disabled
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              formData.origin.map((item, index) => (
                <div key={index} className={styles.originRow}>
                  <input
                    type="text"
                    placeholder="ex) 돼지고기"
                    value={item.ingredient}
                    onChange={(e) => updateCustomOrigin(index, 'ingredient', e.target.value)}
                    className={styles.textInput}
                  />
                  <div className={styles.originInputWrapper}>
                    <input
                      type="text"
                      placeholder="ex) 국내산"
                      value={item.origin}
                      onChange={(e) => updateCustomOrigin(index, 'origin', e.target.value)}
                      className={styles.textInput}
                    />
                    {index === formData.origin.length - 1 ? (
                      <button
                        type="button"
                        onClick={addCustomOrigin}
                        className={styles.addOriginButton}
                      >
                        +
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeCustomOrigin(index)}
                        className={styles.removeOriginButton}
                      >
                        −
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 상품 배송 설정 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>8</span>
            <span className={styles.sectionTitle}>상품 배송 설정</span>
          </div>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.deliveryMethods.self}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  deliveryMethods: { ...prev.deliveryMethods, self: e.target.checked }
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.deliveryMethods.self ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              자체 배송
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.deliveryMethods.quick}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  deliveryMethods: { ...prev.deliveryMethods, quick: e.target.checked }
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.deliveryMethods.quick ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              퀵업체 배송
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.deliveryMethods.pickup}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  deliveryMethods: { ...prev.deliveryMethods, pickup: e.target.checked }
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.deliveryMethods.pickup ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              매장 픽업
            </label>
          </div>
        </div>

        {/* 상품주문 추가설정 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>9</span>
            <span className={styles.sectionTitle}>상품주문 추가설정</span>
          </div>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.additionalSettings.sameDayDelivery}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalSettings: { ...prev.additionalSettings, sameDayDelivery: e.target.checked }
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.additionalSettings.sameDayDelivery ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              당일배송가능
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.additionalSettings.thermalPack}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalSettings: { ...prev.additionalSettings, thermalPack: e.target.checked }
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.additionalSettings.thermalPack ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              보온•냉팩 포장 가능
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.additionalSettings.stickerCustom}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalSettings: { ...prev.additionalSettings, stickerCustom: e.target.checked }
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.additionalSettings.stickerCustom ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              스티커 제작 가능
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.additionalSettings.giftItem}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalSettings: { ...prev.additionalSettings, giftItem: e.target.checked }
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.additionalSettings.giftItem ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              답례품
            </label>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className={styles.buttonContainer}>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.cancelButton}
          >
            취소
          </button>
          <button
            type="button"
            onClick={hasSavedData ? handleLoadFromLocal : handleSaveToLocal}
            className={styles.tempSaveButton}
          >
            {hasSavedData ? '임시저장 불러오기' : '임시저장'}
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? '등록 중...' : '상품 등록'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}