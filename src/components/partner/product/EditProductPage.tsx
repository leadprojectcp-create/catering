'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProduct, updateProduct } from '@/lib/services/productService'
import { useAuth } from '@/contexts/AuthContext'
import StoreInfoRequiredModal from './StoreInfoRequiredModal'
import OptionHelpModal from './OptionHelpModal'
import EditImageUploadSection from './sections/EditImageUploadSection'
import ProductNameSection from './sections/ProductNameSection'
import ProductTypeSection from './sections/ProductTypeSection'
import CategorySection from './sections/CategorySection'
import PriceSection from './sections/PriceSection'
import QuantitySection from './sections/QuantitySection'
import OptionSection from './sections/OptionSection'
import AdditionalOptionSection from './sections/AdditionalOptionSection'
import DescriptionSection from './sections/DescriptionSection'
import OriginSection from './sections/OriginSection'
import DeliveryMethodSection, { DeliveryFeeSettings } from './sections/DeliveryMethodSection'
import AdditionalSettingsSection from './sections/AdditionalSettingsSection'
import MinOrderDaysSection from './sections/MinOrderDaysSection'
import { ProductFormData } from './types'
import styles from './AddProductPage.module.css'

interface EditProductFormData extends Omit<ProductFormData, 'images'> {
  images: string[]
  status?: 'active' | 'inactive' | 'pending'
  discountedPrice?: number
}

export default function EditProductPage({ productId }: { productId: string }) {
  const router = useRouter()
  const { user, userData, loading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [newImages, setNewImages] = useState<File[]>([])
  const [storeId, setStoreId] = useState<string>('')
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false)
  const [missingInfo, setMissingInfo] = useState<string>('')
  const [showOptionHelpModal, setShowOptionHelpModal] = useState(false)
  const [optionsEnabled, setOptionsEnabled] = useState(false)
  const [additionalOptionsEnabled, setAdditionalOptionsEnabled] = useState(false)
  const [deliveryFeeSettings, setDeliveryFeeSettings] = useState<DeliveryFeeSettings>({ type: '무료' })
  const [formData, setFormData] = useState<EditProductFormData>({
    name: '',
    images: [],
    price: 0,
    category: '',
    productTypes: [],
    options: [{ groupName: '', values: [{ name: '', price: 0 }] }],
    additionalOptions: [{ groupName: '', values: [{ name: '', price: 0 }] }],
    description: '',
    minOrderQuantity: 10,
    maxOrderQuantity: 11,
    deliveryMethods: [],
    additionalSettings: [],
    minOrderDays: 3,
    origin: [],
    status: 'pending',
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

  // 할인 계산 (handleSubmit에서 사용)
  const calculateDiscountedPrice = () => {
    if (!formData.discount?.enabled || !formData.discount.value) return formData.price

    if (formData.discount.type === 'amount') {
      return Math.max(0, formData.price - formData.discount.value)
    } else {
      return Math.max(0, formData.price * (1 - formData.discount.value / 100))
    }
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
              if (product.deliveryMethods.quick) deliveryMethodsArray.push('퀵업체 배송')
              if (product.deliveryMethods.parcel) deliveryMethodsArray.push('택배 배송')
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

          // storeId 저장
          if (product.storeId) {
            setStoreId(product.storeId)
          }

          // deliveryFeeSettings 불러오기
          if (product.deliveryFeeSettings) {
            setDeliveryFeeSettings(product.deliveryFeeSettings as DeliveryFeeSettings)
          }

          setFormData({
            name: product.name || '',
            images: product.images || [],
            price: product.price || 0,
            category: product.category || '',
            productTypes: Array.isArray(product.productTypes) ? product.productTypes : [],
            options: product.options || [{ groupName: '', values: [{ name: '', price: 0 }] }],
            additionalOptions: product.additionalOptions || [{ groupName: '', values: [{ name: '', price: 0 }] }],
            description: product.description || '',
            minOrderQuantity: product.minOrderQuantity || 10,
            maxOrderQuantity: product.maxOrderQuantity || 11,
            deliveryMethods: deliveryMethodsArray,
            additionalSettings: additionalSettingsArray,
            minOrderDays: product.minOrderDays || 3,
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

          // 옵션 토글 상태 초기화 - DB에 저장된 값이 있으면 사용, 없으면 기존 로직
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const productAny = product as any
          if (productAny.optionsEnabled !== undefined) {
            setOptionsEnabled(productAny.optionsEnabled)
          } else if (product.options && product.options.length > 0 && product.options[0].groupName) {
            setOptionsEnabled(true)
          }

          if (productAny.additionalOptionsEnabled !== undefined) {
            setAdditionalOptionsEnabled(productAny.additionalOptionsEnabled)
          } else if (product.additionalOptions && product.additionalOptions.length > 0 && product.additionalOptions[0].groupName) {
            setAdditionalOptionsEnabled(true)
          }
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    // 유효성 검사 (3번 상품 타입 설정 제외 모든 필드 필수)
    if (formData.images.length === 0 && newImages.length === 0) {
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

    // 추가설정은 선택사항이므로 검사하지 않음

    if (formData.minOrderDays < 0) {
      alert('최소 주문 날짜를 선택해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      // 새로운 이미지 업로드 처리
      const uploadedImageUrls: string[] = [...formData.images]

      for (const imageFile of newImages) {
        const formDataToUpload = new FormData()
        formDataToUpload.append('file', imageFile)
        formDataToUpload.append('type', 'product')
        formDataToUpload.append('storeId', storeId)
        formDataToUpload.append('productId', productId)

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

      // 옵션 필터링 (설정이 활성화된 경우에만)
      const filteredOptions = optionsEnabled ? formData.options
        .filter(option =>
          option.groupName.trim() !== '' &&
          option.values.some(v => v.name.trim() !== '')
        )
        .map(option => ({
          ...option,
          values: option.values.filter(v => v.name.trim() !== '')
        })) : []

      // 추가상품 옵션 필터링 (설정이 활성화된 경우에만)
      const filteredAdditionalOptions = additionalOptionsEnabled ? formData.additionalOptions
        .filter(option =>
          option.groupName.trim() !== '' &&
          option.values.some(v => v.name.trim() !== '')
        )
        .map(option => ({
          ...option,
          values: option.values.filter(v => v.name.trim() !== '')
        })) : []

      // 수정된 데이터 준비
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitData: any = {
        ...formData,
        images: uploadedImageUrls,
        optionsEnabled, // 옵션 설정 여부 저장
        options: filteredOptions, // 유효성 검사 통과한 옵션들
        additionalOptionsEnabled, // 추가상품 설정 여부 저장
        additionalOptions: filteredAdditionalOptions.length > 0 ? filteredAdditionalOptions : [], // 비어있으면 빈 배열로 덮어쓰기
        deliveryFeeSettings: formData.deliveryMethods.includes('택배 배송') ? deliveryFeeSettings : null, // 택배 배송일 때만 배송비 설정 저장, 아니면 제거
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
        <EditImageUploadSection
          existingImages={formData.images}
          newImages={newImages}
          onExistingImageRemove={(index) => setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
          }))}
          onNewImagesAdd={(files) => setNewImages(prev => [...prev, ...files])}
          onNewImageRemove={(index) => setNewImages(prev => prev.filter((_, i) => i !== index))}
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
          category={formData.category}
          onChange={(category) => setFormData(prev => ({ ...prev, category }))}
        />

        {/* 상품 판매가 */}
        <PriceSection
          price={formData.price}
          discount={formData.discount}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        />

        {/* 상품 수량 설정 */}
        <QuantitySection
          minOrderQuantity={formData.minOrderQuantity}
          maxOrderQuantity={formData.maxOrderQuantity}
          onChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        />

        {/* 상품 옵션 설정 */}
        <OptionSection
          options={formData.options}
          onChange={(options) => setFormData(prev => ({ ...prev, options }))}
          onShowHelpModal={() => setShowOptionHelpModal(true)}
          enabled={optionsEnabled}
          onToggle={(enabled) => {
            setOptionsEnabled(enabled)
            // 설정을 켤 때 빈 배열이면 기본 옵션 카드 추가
            if (enabled && formData.options.length === 0) {
              setFormData(prev => ({
                ...prev,
                options: [{ groupName: '', values: [{ name: '', price: 0 }] }]
              }))
            }
          }}
        />

        {/* 추가상품 옵션 */}
        <AdditionalOptionSection
          options={formData.additionalOptions}
          onChange={(additionalOptions) => setFormData(prev => ({ ...prev, additionalOptions }))}
          onShowHelpModal={() => setShowOptionHelpModal(true)}
          enabled={additionalOptionsEnabled}
          onToggle={(enabled) => {
            setAdditionalOptionsEnabled(enabled)
            // 설정을 켤 때 빈 배열이면 기본 옵션 카드 추가
            if (enabled && formData.additionalOptions.length === 0) {
              setFormData(prev => ({
                ...prev,
                additionalOptions: [{ groupName: '', values: [{ name: '', price: 0 }] }]
              }))
            }
          }}
        />

        {/* 상품설명 작성 */}
        <DescriptionSection
          description={formData.description}
          onChange={(description) => setFormData(prev => ({ ...prev, description }))}
          storeId={storeId}
          productId={productId}
        />

        {/* 원산지 표기 */}
        <OriginSection
          origin={formData.origin}
          onChange={(origin) => setFormData(prev => ({ ...prev, origin }))}
        />

        {/* 상품 배송 설정 */}
        <DeliveryMethodSection
          deliveryMethods={formData.deliveryMethods}
          deliveryFeeSettings={deliveryFeeSettings}
          onChange={(deliveryMethods) => setFormData(prev => ({ ...prev, deliveryMethods }))}
          onDeliveryFeeChange={setDeliveryFeeSettings}
        />

        {/* 상품주문 추가설정 */}
        <AdditionalSettingsSection
          additionalSettings={formData.additionalSettings}
          onChange={(additionalSettings) => setFormData(prev => ({ ...prev, additionalSettings }))}
        />

        {/* 최소 주문 날짜 */}
        <MinOrderDaysSection
          minOrderDays={formData.minOrderDays}
          onChange={(minOrderDays) => setFormData(prev => ({ ...prev, minOrderDays }))}
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
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? '수정 중...' : '상품 수정'}
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
    </div>
  )
}