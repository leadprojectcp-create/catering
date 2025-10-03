'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProduct, updateProduct } from '@/lib/services/productService'
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
  images: string[]
  price: number
  options: ProductOption[]
  description: string
  minOrderQuantity: number
  maxOrderQuantity: number
  deliveryMethods: string[]
  additionalSettings: string[]
  origin: { ingredient: string, origin: string }[]
  status?: 'active' | 'inactive' | 'pending'
  discount?: {
    enabled: boolean
    type: 'amount' | 'percent'
    value: number
    startDate: string | null
    endDate: string | null
    isAlwaysActive: boolean
  }
  discountedPrice?: number
}

export default function EditProductPage({ productId }: { productId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [newImages, setNewImages] = useState<File[]>([])
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
    deliveryMethods: [],
    additionalSettings: [],
    origin: [],
    status: 'pending'
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

    for (let i = 0; i < monthData.firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.calendarDay}></div>)
    }

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

  // 기존 상품 데이터 불러오기
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const product = await getProduct(productId)
        if (product) {
          // Convert deliveryMethods from object to string array
          let deliveryMethodsArray: string[] = []
          if (product.deliveryMethods) {
            if (Array.isArray(product.deliveryMethods)) {
              deliveryMethodsArray = product.deliveryMethods
            } else {
              // Convert from old object format to array
              if (product.deliveryMethods.self) deliveryMethodsArray.push('자체 배송')
              if (product.deliveryMethods.quick) deliveryMethodsArray.push('퀵업체 배송')
              if (product.deliveryMethods.pickup) deliveryMethodsArray.push('매장 픽업')
            }
          }

          // Convert additionalSettings from object to string array
          let additionalSettingsArray: string[] = []
          if (product.additionalSettings) {
            if (Array.isArray(product.additionalSettings)) {
              additionalSettingsArray = product.additionalSettings
            } else {
              // Convert from old object format to array
              if (product.additionalSettings.sameDayDelivery) additionalSettingsArray.push('당일배송가능')
              if (product.additionalSettings.thermalPack) additionalSettingsArray.push('보온•냉팩 포장 가능')
              if (product.additionalSettings.stickerCustom) additionalSettingsArray.push('스티커 제작 가능')
              if (product.additionalSettings.giftItem) additionalSettingsArray.push('답례품')
            }
          }

          setFormData({
            name: product.name || '',
            images: product.images || [],
            price: product.price || 0,
            options: product.options || [{ groupName: '', values: [{ name: '', price: 0 }] }],
            description: product.description || '',
            minOrderQuantity: product.minOrderQuantity || 10,
            maxOrderQuantity: product.maxOrderQuantity || 11,
            deliveryMethods: deliveryMethodsArray,
            additionalSettings: additionalSettingsArray,
            origin: Array.isArray(product.origin) ? product.origin : [],
            status: product.status as 'active' | 'inactive' | 'pending',
            discount: product.discount ? {
              enabled: !!(product.discount && product.discountedPrice),
              type: product.discount.type || 'percent',
              value: product.discount.value || 0,
              startDate: product.discount.startDate || null,
              endDate: product.discount.endDate || null,
              isAlwaysActive: product.discount.isAlwaysActive !== undefined ? product.discount.isAlwaysActive : true
            } : {
              enabled: false,
              type: 'percent',
              value: 0,
              startDate: null,
              endDate: null,
              isAlwaysActive: true
            },
            discountedPrice: product.discountedPrice
          })
        }
      } catch (error) {
        console.error('상품 정보 로딩 실패:', error)
        alert('상품 정보를 불러오는 데 실패했습니다.')
        router.back()
      } finally {
        setIsLoading(false)
      }
    }

    loadProduct()
  }, [productId, router])

  // Handle cancel
  const handleCancel = () => {
    if (confirm('수정중인 내용이 삭제됩니다. 취소하시겠습니까?')) {
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

    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      // 새로운 이미지 업로드 처리
      const uploadedImageUrls: string[] = [...formData.images]

      for (const imageFile of newImages) {
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

      // 수정된 데이터 준비
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitData: any = {
        ...formData,
        images: uploadedImageUrls,
        updatedAt: new Date().toISOString()
      }

      // 할인이 활성화되어 있으면 할인 데이터 추가
      if (formData.discount?.enabled && formData.discount.value > 0) {
        const discountedPrice = Math.round(calculateDiscountedPrice())
        const discountAmount = formData.price - discountedPrice
        const discountPercent = formData.price > 0 ? Math.round((discountAmount / formData.price) * 100) : 0

        submitData.discount = {
          discountAmount: discountAmount,
          discountPercent: discountPercent,
          startDate: formData.discount.startDate,
          endDate: formData.discount.endDate,
          isAlwaysActive: formData.discount.isAlwaysActive
        }
        submitData.discountedPrice = discountedPrice
        console.log('=== 할인 데이터 ===', submitData.discount)
      } else {
        // 할인이 비활성화되면 기존 할인 데이터 제거
        submitData.discount = null
        submitData.discountedPrice = null
      }

      console.log('=== 최종 저장 데이터 ===', submitData)
      // Firestore 업데이트
      await updateProduct(productId, submitData)

      alert('상품이 성공적으로 수정되었습니다!')
      router.push('/partner/product/management')

    } catch (error) {
      console.error('상품 수정 중 오류:', error)
      alert('상품 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>상품 정보를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>상품 수정</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
        {/* 상품 이미지 등록 */}
        <div className={styles.section}>
          <div className={styles.titleWithNumber}>
            <span className={styles.numberCircle}>1</span>
            <span className={styles.sectionTitle}>상품 이미지 등록</span>
          </div>
          <div className={styles.imageUploadSection}>
            <div className={styles.imageGrid}>
              {/* 기존 이미지 미리보기 */}
              {formData.images.map((url, index) => (
                <div key={`existing-${index}`} className={`${styles.imagePreviewBox} ${index === 0 ? styles.mainImage : ''}`}>
                  <img
                    src={url}
                    alt={`상품 이미지 ${index + 1}`}
                    className={styles.previewImage}
                  />
                  {index === 0 && (
                    <div className={styles.mainImageLabel}>대표</div>
                  )}
                  <button
                    type="button"
                    className={styles.removeImageBtn}
                    onClick={() => removeImage(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* 새로 추가한 이미지 미리보기 */}
              {newImages.map((file, index) => (
                <div key={`new-${index}`} className={styles.imagePreviewBox}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`새 이미지 ${index + 1}`}
                    className={styles.previewImage}
                  />
                  <button
                    type="button"
                    className={styles.removeImageBtn}
                    onClick={() => {
                      setNewImages(prev => prev.filter((_, i) => i !== index))
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
                    setNewImages(prev => [...prev, ...files])
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
                      disabled={formData.discount?.isAlwaysActive}
                      readOnly
                      onClick={() => {
                        if (!formData.discount?.isAlwaysActive) {
                          setShowCalendar(!showCalendar)
                          setSelectingDate('start')
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.calendarButton}
                      disabled={formData.discount?.isAlwaysActive}
                      onClick={() => {
                        setShowCalendar(!showCalendar)
                        setSelectingDate('start')
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M6.66667 1.66666V4.16666M13.3333 1.66666V4.16666M2.5 7.49999H17.5M4.16667 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 4.99999V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16667C3.24619 18.3333 2.5 17.5871 2.5 16.6667V4.99999C2.5 4.07952 3.24619 3.33333 4.16667 3.33333Z" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {showCalendar && !formData.discount?.isAlwaysActive && renderCalendar()}
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
                    <span style={{ fontWeight: '600', color: '#EA4335' }}>할인가</span>
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
            {!formData.origin || formData.origin.length === 0 ? (
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
              formData.origin && Array.isArray(formData.origin) && formData.origin.map((item, index) => (
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
                checked={formData.deliveryMethods.includes('자체 배송')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  deliveryMethods: e.target.checked
                    ? [...prev.deliveryMethods, '자체 배송']
                    : prev.deliveryMethods.filter(m => m !== '자체 배송')
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.deliveryMethods.includes('자체 배송') ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              자체 배송
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.deliveryMethods.includes('퀵업체 배송')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  deliveryMethods: e.target.checked
                    ? [...prev.deliveryMethods, '퀵업체 배송']
                    : prev.deliveryMethods.filter(m => m !== '퀵업체 배송')
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.deliveryMethods.includes('퀵업체 배송') ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              퀵업체 배송
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.deliveryMethods.includes('매장 픽업')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  deliveryMethods: e.target.checked
                    ? [...prev.deliveryMethods, '매장 픽업']
                    : prev.deliveryMethods.filter(m => m !== '매장 픽업')
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.deliveryMethods.includes('매장 픽업') ? "/icons/check_active.png" : "/icons/check.png"}
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
                checked={formData.additionalSettings.includes('당일배송가능')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalSettings: e.target.checked
                    ? [...prev.additionalSettings, '당일배송가능']
                    : prev.additionalSettings.filter(s => s !== '당일배송가능')
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.additionalSettings.includes('당일배송가능') ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              당일배송가능
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.additionalSettings.includes('보온•냉팩 포장 가능')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalSettings: e.target.checked
                    ? [...prev.additionalSettings, '보온•냉팩 포장 가능']
                    : prev.additionalSettings.filter(s => s !== '보온•냉팩 포장 가능')
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.additionalSettings.includes('보온•냉팩 포장 가능') ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              보온•냉팩 포장 가능
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.additionalSettings.includes('스티커 제작 가능')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalSettings: e.target.checked
                    ? [...prev.additionalSettings, '스티커 제작 가능']
                    : prev.additionalSettings.filter(s => s !== '스티커 제작 가능')
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.additionalSettings.includes('스티커 제작 가능') ? "/icons/check_active.png" : "/icons/check.png"}
                  alt="체크박스"
                />
              </span>
              스티커 제작 가능
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.additionalSettings.includes('답례품')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  additionalSettings: e.target.checked
                    ? [...prev.additionalSettings, '답례품']
                    : prev.additionalSettings.filter(s => s !== '답례품')
                }))}
                className={styles.hiddenCheckbox}
              />
              <span className={styles.customCheckbox}>
                <img
                  src={formData.additionalSettings.includes('답례품') ? "/icons/check_active.png" : "/icons/check.png"}
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
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? '수정 중...' : '상품 수정'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}