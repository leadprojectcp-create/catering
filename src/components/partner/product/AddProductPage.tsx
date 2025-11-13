'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createProduct } from '@/lib/services/productService'
import { useAuth } from '@/contexts/AuthContext'
import CustomEditor from '@/components/common/CustomEditor'
import StoreInfoRequiredModal from './common/modals/StoreInfoRequiredModal'
import OptionHelpModal from './common/modals/OptionHelpModal'
import AdditionalProductHelpModal from './common/modals/AdditionalProductHelpModal'
import ImageUploadSection from './sections/ImageUploadSection'
import ProductNameSection from './sections/ProductNameSection'
import ProductTypeSection from './sections/ProductTypeSection'
import CategorySection from './sections/CategorySection'
import PriceSection from './sections/PriceSection'
import QuantitySection from './sections/QuantitySection'
import OptionSection from './sections/OptionSection'
import AdditionalOptionSection from './sections/AdditionalOptionSection'
import DescriptionSection from './sections/DescriptionSection'
import OriginSection from './sections/OriginSection'
import DeliveryMethodSection, { DeliveryFeeSettings, QuickDeliveryFeeSettings } from './sections/DeliveryMethodSection'
import AdditionalSettingsSection from './sections/AdditionalSettingsSection'
import { ProductFormData, ProductOption, categories } from './common/types/types'
import styles from './AddProductPage.module.css'

export default function AddProductPage() {
  const router = useRouter()
  const { user, userData, loading } = useAuth()
  const [hasSavedData, setHasSavedData] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tempProductId] = useState(() => `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`)
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false)
  const [missingInfo, setMissingInfo] = useState<string>('')
  const [showOptionHelpModal, setShowOptionHelpModal] = useState(false)
  const [showAdditionalProductHelpModal, setShowAdditionalProductHelpModal] = useState(false)
  const [optionsEnabled, setOptionsEnabled] = useState(false)
  const [additionalOptionsEnabled, setAdditionalOptionsEnabled] = useState(false)
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    images: [],
    price: 0,
    category: [],
    productTypes: [],
    options: [{ groupName: '', values: [{ name: '', price: 0 }] }],
    additionalOptions: [{ groupName: '', values: [{ name: '', price: 0 }] }],
    description: '',
    minOrderQuantity: 10,
    maxOrderQuantity: 11,
    quantityRanges: [{ minQuantity: 10, maxQuantity: 20, daysBeforeOrder: 1 }],
    deliveryMethods: [],
    quickDeliveryFeeSettings: { type: '무료' },
    deliveryFeeSettings: { type: '무료' },
    additionalSettings: [],
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

  // 가게 정보 등록 확인
  useEffect(() => {
    const checkStoreInfo = async () => {
      if (!loading && user) {
        try {
          const { doc, getDoc } = await import('firebase/firestore')
          const { db } = await import('@/lib/firebase')

          const storeDoc = await getDoc(doc(db, 'stores', user.uid))

          if (!storeDoc.exists()) {
            setMissingInfo('가게 정보가 등록되지 않았습니다.')
            setShowStoreInfoModal(true)
            return
          }

          const storeData = storeDoc.data()

          // 누락된 항목들을 모두 수집
          const missingItems: string[] = []

          // 필수 필드 체크
          const requiredFields = [
            { field: 'storeName', name: '가게명' },
            { field: 'businessRegistration', name: '사업자번호' },
            { field: 'businessRegistrationImage', name: '사업자등록증 이미지' },
          ]

          for (const { field, name } of requiredFields) {
            if (!storeData[field]) {
              missingItems.push(name)
            }
          }

          // 주소 체크
          if (!storeData.address || !storeData.address.fullAddress) {
            missingItems.push('가게 주소')
          }

          // 가게 사진 체크 (최소 3장)
          if (!storeData.storeImages || storeData.storeImages.length < 3) {
            missingItems.push(`가게 사진 (최소 3장 필요, 현재 ${storeData.storeImages?.length || 0}장)`)
          }

          // 휴무일 체크
          if (!storeData.closedDays || storeData.closedDays.length === 0) {
            missingItems.push('휴무일 (연중무휴도 설정 필요)')
          }

          // 누락된 항목이 있으면 모달 표시
          if (missingItems.length > 0) {
            setMissingInfo(missingItems.join(', '))
            setShowStoreInfoModal(true)
            return
          }
        } catch (error) {
          console.error('가게 정보 확인 실패:', error)
        }
      }
    }

    checkStoreInfo()
  }, [loading, user, router])

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



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return // 이미 제출 중이면 무시

    // 인증 확인
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/signin')
      return
    }

    // 유효성 검사 (3번 상품 타입 설정 제외 모든 필드 필수)
    if (formData.images.length === 0) {
      alert('상품 이미지를 최소 1개 이상 등록해주세요.')
      return
    }

    if (!formData.name.trim()) {
      alert('상품명을 입력해주세요.')
      return
    }

    // 3번 상품 타입 설정은 선택사항이므로 검사하지 않음

    if (!formData.category) {
      alert('카테고리를 선택해주세요.')
      return
    }

    if (formData.price <= 0) {
      alert('상품 판매가를 입력해주세요.')
      return
    }

    if (formData.minOrderQuantity <= 0) {
      alert('최소 수량을 입력해주세요.')
      return
    }

    if (formData.maxOrderQuantity <= 0) {
      alert('최대 수량을 입력해주세요.')
      return
    }

    if (formData.minOrderQuantity > formData.maxOrderQuantity) {
      alert('최소 수량은 최대 수량보다 클 수 없습니다.')
      return
    }

    // 옵션 검사 - 설정이 활성화된 경우에만 검사
    if (optionsEnabled) {
      const validOptions = formData.options.filter(option =>
        option.groupName.trim() !== '' &&
        option.values.some(v => v.name.trim() !== '')
      )

      if (validOptions.length === 0) {
        alert('상품 옵션을 최소 1개 이상 등록해주세요.')
        return
      }
    }

    if (!formData.description || formData.description.trim() === '' || formData.description === '<p><br></p>') {
      alert('상품설명을 작성해주세요.')
      return
    }

    if (formData.origin.length === 0 || formData.origin.some(o => !o.ingredient.trim() || !o.origin.trim())) {
      alert('원산지 표기를 입력해주세요.')
      return
    }

    if (formData.deliveryMethods.length === 0) {
      alert('배송 방법을 최소 1개 이상 선택해주세요.')
      return
    }

    // 퀵업체 배송 선택 시 배송비 설정 필수 검사
    if (formData.deliveryMethods.includes('퀵업체 배송')) {
      if (!formData.quickDeliveryFeeSettings?.type) {
        alert('퀵업체 배송 시 배송비 타입(무료/조건부 무료/유료)을 선택해주세요.')
        return
      }

      // 조건부 무료인 경우
      if (formData.quickDeliveryFeeSettings.type === '조건부 무료') {
        if (!formData.quickDeliveryFeeSettings.freeCondition || formData.quickDeliveryFeeSettings.freeCondition <= 0) {
          alert('조건부 무료 배송 시 최소 구매 금액을 입력해주세요.')
          return
        }
        if (formData.quickDeliveryFeeSettings.maxSupport === undefined || formData.quickDeliveryFeeSettings.maxSupport < 0) {
          alert('조건부 무료 배송 시 퀵 비용 지원액을 입력해주세요.')
          return
        }
      }
    }

    // 택배 배송 선택 시 배송비 설정 필수 검사
    if (formData.deliveryMethods.includes('택배 배송')) {
      if (!formData.deliveryFeeSettings?.type) {
        alert('택배 배송 시 배송비 타입(무료/조건부 무료/유료/수량별)을 선택해주세요.')
        return
      }

      // 조건부 무료인 경우
      if (formData.deliveryFeeSettings.type === '조건부 무료') {
        if (!formData.deliveryFeeSettings.baseFee || formData.deliveryFeeSettings.baseFee <= 0) {
          alert('조건부 무료 배송 시 기본 배송비를 입력해주세요.')
          return
        }
        if (!formData.deliveryFeeSettings.freeCondition || formData.deliveryFeeSettings.freeCondition <= 0) {
          alert('조건부 무료 배송 시 무료 배송 조건 금액을 입력해주세요.')
          return
        }
      }

      // 유료인 경우
      if (formData.deliveryFeeSettings.type === '유료') {
        if (!formData.deliveryFeeSettings.baseFee || formData.deliveryFeeSettings.baseFee <= 0) {
          alert('유료 배송 시 기본 배송비를 입력해주세요.')
          return
        }
      }

      // 수량별인 경우
      if (formData.deliveryFeeSettings.type === '수량별') {
        if (!formData.deliveryFeeSettings.baseFee || formData.deliveryFeeSettings.baseFee <= 0) {
          alert('수량별 배송 시 기본 배송비를 입력해주세요.')
          return
        }
        if (!formData.deliveryFeeSettings.perQuantity || formData.deliveryFeeSettings.perQuantity <= 0) {
          alert('수량별 배송 시 반복 부과 수량을 입력해주세요.')
          return
        }
      }
    }

    // 추가설정은 선택사항이므로 검사하지 않음

    setIsSubmitting(true)

    try {

      // 이미지 업로드 처리
      const uploadedImageUrls: string[] = []
      const storeId = user.uid // storeId는 user.uid와 동일

      for (const imageFile of formData.images) {
        const formDataToUpload = new FormData()
        formDataToUpload.append('file', imageFile)
        formDataToUpload.append('type', 'product')
        formDataToUpload.append('storeId', storeId)
        formDataToUpload.append('productId', tempProductId)

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

      // 옵션 필터링 (비활성화되어도 기존 데이터 유지)
      const filteredOptions = formData.options
        .filter(option =>
          option.groupName.trim() !== '' &&
          option.values.some(v => v.name.trim() !== '')
        )
        .map(option => ({
          ...option,
          values: option.values.filter(v => v.name.trim() !== '')
        }))

      // 추가상품 옵션 필터링 (비활성화되어도 기존 데이터 유지)
      const filteredAdditionalOptions = formData.additionalOptions
        .filter(option =>
          option.groupName.trim() !== '' &&
          option.values.some(v => v.name.trim() !== '')
        )
        .map(option => ({
          ...option,
          values: option.values.filter(v => v.name.trim() !== '')
        }))

      // orderType을 'single'로 고정하여 전송
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitData: any = {
        ...formData,
        images: uploadedImageUrls, // File 객체 대신 업로드된 URL들
        optionsEnabled, // 옵션 설정 여부 저장
        options: filteredOptions, // 유효성 검사 통과한 옵션들
        additionalOptionsEnabled, // 추가상품 설정 여부 저장
        additionalOptions: filteredAdditionalOptions.length > 0 ? filteredAdditionalOptions : undefined, // 비어있으면 undefined
        orderType: 'single', // 항상 단건주문으로 설정
        quickDeliveryFeeSettings: formData.deliveryMethods.includes('퀵업체 배송') ? formData.quickDeliveryFeeSettings : undefined, // 퀵업체 배송일 때만 배송비 설정 저장
        deliveryFeeSettings: formData.deliveryMethods.includes('택배 배송') ? formData.deliveryFeeSettings : undefined, // 택배 배송일 때만 배송비 설정 저장
        createdAt: new Date().toISOString()
      }

      // 할인이 활성화되어 있으면 할인 데이터 추가
      if (formData.discount?.enabled && formData.discount.value > 0) {
        const discountedPrice = Math.round(calculateDiscountedPrice())
        const discountAmount = formData.price - discountedPrice
        const discountPercent = formData.price > 0 ? Math.round((discountAmount / formData.price) * 100) : 0

        submitData.discount = {
          type: formData.discount.type,
          value: formData.discount.value,
          discountAmount: discountAmount,
          discountPercent: discountPercent,
          startDate: formData.discount.startDate,
          endDate: formData.discount.endDate,
          isAlwaysActive: formData.discount.isAlwaysActive
        }
        submitData.discountedPrice = discountedPrice
        console.log('=== 할인 데이터 ===', submitData.discount)
      }

      console.log('=== 최종 저장 데이터 ===', submitData)
      // productService를 사용하여 Firestore에 저장
      await createProduct(submitData)
      alert('상품이 성공적으로 등록되었습니다!')

      // 임시저장 데이터 삭제
      localStorage.removeItem('productFormData')

      // 목록 페이지로 이동
      router.push('/partner/product/management')

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
        <ImageUploadSection
          images={formData.images}
          onChange={(images) => setFormData(prev => ({ ...prev, images }))}
        />

        {/* 상품명 */}
        <ProductNameSection
          name={formData.name}
          onChange={(name) => setFormData(prev => ({ ...prev, name }))}
        />

        {/* 상품 타입 설정 */}
        <ProductTypeSection
          productTypes={formData.productTypes}
          onChange={(productTypes) => setFormData(prev => ({ ...prev, productTypes }))}
        />

        {/* 카테고리 */}
        <CategorySection
          categories={formData.category}
          onChange={(category) => setFormData(prev => ({ ...prev, category }))}
        />

        {/* 상품 판매가 */}
        <PriceSection
          price={formData.price}
          discount={formData.discount}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        />

        {/* 상품 수량별 주문 조건 설정 */}
        <QuantitySection
          minOrderQuantity={formData.minOrderQuantity}
          maxOrderQuantity={formData.maxOrderQuantity}
          quantityRanges={formData.quantityRanges}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        />

        {/* 상품 옵션 설정 */}
        <OptionSection
          options={formData.options}
          onChange={(options) => setFormData(prev => ({ ...prev, options }))}
          onShowHelpModal={() => setShowOptionHelpModal(true)}
          enabled={optionsEnabled}
          onToggle={setOptionsEnabled}
        />

        {/* 추가상품 옵션 */}
        <AdditionalOptionSection
          options={formData.additionalOptions}
          onChange={(additionalOptions) => setFormData(prev => ({ ...prev, additionalOptions }))}
          onShowHelpModal={() => setShowAdditionalProductHelpModal(true)}
          enabled={additionalOptionsEnabled}
          onToggle={setAdditionalOptionsEnabled}
        />

        {/* 상품설명 작성 */}
        <DescriptionSection
          description={formData.description}
          onChange={(description) => setFormData(prev => ({ ...prev, description }))}
          storeId={user?.uid}
          productId={tempProductId}
        />

        {/* 원산지 표기 */}
        <OriginSection
          origin={formData.origin}
          onChange={(origin) => setFormData(prev => ({ ...prev, origin }))}
        />

        {/* 상품 배송 설정 */}
        <DeliveryMethodSection
          deliveryMethods={formData.deliveryMethods}
          quickDeliveryFeeSettings={formData.quickDeliveryFeeSettings}
          deliveryFeeSettings={formData.deliveryFeeSettings}
          onChange={(deliveryMethods) => setFormData(prev => ({ ...prev, deliveryMethods }))}
          onQuickDeliveryFeeChange={(settings) => setFormData(prev => ({ ...prev, quickDeliveryFeeSettings: settings }))}
          onDeliveryFeeChange={(settings) => setFormData(prev => ({ ...prev, deliveryFeeSettings: settings }))}
        />

        {/* 상품주문 추가설정 */}
        <AdditionalSettingsSection
          additionalSettings={formData.additionalSettings}
          onChange={(additionalSettings) => setFormData(prev => ({ ...prev, additionalSettings }))}
        />

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

      {/* 가게 정보 미등록 모달 */}
      {showStoreInfoModal && (
        <StoreInfoRequiredModal
          missingInfo={missingInfo}
          onClose={() => setShowStoreInfoModal(false)}
        />
      )}

      {/* 옵션 설정 도움말 모달 */}
      {showOptionHelpModal && (
        <OptionHelpModal
          onClose={() => setShowOptionHelpModal(false)}
        />
      )}

      {/* 추가상품 설정 도움말 모달 */}
      {showAdditionalProductHelpModal && (
        <AdditionalProductHelpModal
          onClose={() => setShowAdditionalProductHelpModal(false)}
        />
      )}
    </div>
  )
}