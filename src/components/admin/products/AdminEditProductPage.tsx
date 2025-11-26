'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getProduct, updateProduct } from '@/lib/services/productService'
import OptionHelpModal from '@/components/partner/product/common/modals/OptionHelpModal'
import AdditionalProductHelpModal from '@/components/partner/product/common/modals/AdditionalProductHelpModal'
import EditImageUploadSection from '@/components/partner/product/sections/EditImageUploadSection'
import ProductNameSection from '@/components/partner/product/sections/ProductNameSection'
import ProductTypeSection from '@/components/partner/product/sections/ProductTypeSection'
import CategorySection from '@/components/partner/product/sections/CategorySection'
import PriceSection from '@/components/partner/product/sections/PriceSection'
import QuantitySection from '@/components/partner/product/sections/QuantitySection'
import OptionSection from '@/components/partner/product/sections/OptionSection'
import AdditionalOptionSection from '@/components/partner/product/sections/AdditionalOptionSection'
import DescriptionSection from '@/components/partner/product/sections/DescriptionSection'
import OriginSection from '@/components/partner/product/sections/OriginSection'
import DeliveryMethodSection, { DeliveryFeeSettings, QuickDeliveryFeeSettings } from '@/components/partner/product/sections/DeliveryMethodSection'
import AdditionalSettingsSection from '@/components/partner/product/sections/AdditionalSettingsSection'
import { ProductFormData } from '@/components/partner/product/common/types/types'
import SearchableStoreSelect from './SearchableStoreSelect'
import styles from './AdminAddProductPage.module.css'

interface Store {
  id: string
  storeName: string
  companyName?: string
  partnerId?: string
  partnerEmail?: string
}

interface EditProductFormData extends Omit<ProductFormData, 'images'> {
  images: string[]
  status?: 'active' | 'inactive' | 'pending'
  discountedPrice?: number
}

export default function AdminEditProductPage({ productId }: { productId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [newImages, setNewImages] = useState<File[]>([])
  const [showOptionHelpModal, setShowOptionHelpModal] = useState(false)
  const [showAdditionalProductHelpModal, setShowAdditionalProductHelpModal] = useState(false)
  const [optionsEnabled, setOptionsEnabled] = useState(false)
  const [additionalOptionsEnabled, setAdditionalOptionsEnabled] = useState(false)

  // 관리자 전용: 스토어 선택
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [currentStoreName, setCurrentStoreName] = useState<string>('')
  const [loadingStores, setLoadingStores] = useState(true)

  const [formData, setFormData] = useState<EditProductFormData>({
    name: '',
    images: [],
    price: 0,
    category: [],
    productTypes: [],
    options: [{ groupName: '', values: [{ name: '', price: 0 }] }],
    additionalOptions: [{ groupName: '', values: [{ name: '', price: 0 }] }],
    description: '',
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    quantityRanges: [{ minQuantity: 1, maxQuantity: 10, daysBeforeOrder: 1 }],
    deliveryMethods: [],
    quickDeliveryFeeSettings: { type: '무료' },
    deliveryFeeSettings: { type: '무료' },
    additionalSettings: [],
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

  // 스토어 목록 로드
  useEffect(() => {
    const loadStores = async () => {
      try {
        const q = query(
          collection(db, 'stores'),
          where('status', '==', 'active'),
          orderBy('storeName', 'asc')
        )
        const snapshot = await getDocs(q)
        const storesData: Store[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Store))
        setStores(storesData)
      } catch (error) {
        console.error('스토어 목록 로드 실패:', error)
      } finally {
        setLoadingStores(false)
      }
    }
    loadStores()
  }, [])

  // 할인 계산
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
          // 스토어 ID 설정
          if (product.storeId) {
            setSelectedStoreId(product.storeId)
            // 스토어 이름 가져오기
            const storeDoc = await getDoc(doc(db, 'stores', product.storeId))
            if (storeDoc.exists()) {
              const storeData = storeDoc.data()
              setCurrentStoreName(storeData.storeName || '')
            }
          }

          // Convert deliveryMethods from object to string array
          let deliveryMethodsArray: string[] = []
          if (product.deliveryMethods) {
            if (Array.isArray(product.deliveryMethods)) {
              deliveryMethodsArray = product.deliveryMethods
            } else {
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
            category: Array.isArray(product.category) ? product.category : (product.category ? [product.category] : []),
            productTypes: Array.isArray(product.productTypes) ? product.productTypes : [],
            options: product.options || [{ groupName: '', values: [{ name: '', price: 0 }] }],
            additionalOptions: product.additionalOptions || [{ groupName: '', values: [{ name: '', price: 0 }] }],
            description: product.description || '',
            minOrderQuantity: product.minOrderQuantity || 1,
            maxOrderQuantity: product.maxOrderQuantity || 10,
            quantityRanges: product.quantityRanges?.map((range, index) => ({
              minQuantity: range.minQuantity ?? (index === 0 ? (product.minOrderQuantity || 1) : product.quantityRanges![index - 1].maxQuantity),
              maxQuantity: range.maxQuantity,
              daysBeforeOrder: range.daysBeforeOrder
            })) || [{ minQuantity: 1, maxQuantity: 10, daysBeforeOrder: 1 }],
            deliveryMethods: deliveryMethodsArray,
            quickDeliveryFeeSettings: product.quickDeliveryFeeSettings as QuickDeliveryFeeSettings || { type: '무료' },
            deliveryFeeSettings: product.deliveryFeeSettings as DeliveryFeeSettings || { type: '무료' },
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

          // 옵션 토글 상태 초기화
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

    // 스토어 선택 확인
    if (!selectedStoreId) {
      alert('판매자를 선택해주세요.')
      return
    }

    // 유효성 검사
    if (formData.images.length === 0 && newImages.length === 0) {
      alert('상품 이미지를 최소 1개 이상 등록해주세요.')
      return
    }

    if (!formData.name.trim()) {
      alert('상품명을 입력해주세요.')
      return
    }

    if (!formData.category || formData.category.length === 0) {
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

    // 옵션 검사
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

    // 퀵업체 배송 검사
    if (formData.deliveryMethods.includes('퀵업체 배송')) {
      if (!formData.quickDeliveryFeeSettings?.type) {
        alert('퀵업체 배송 시 배송비 타입을 선택해주세요.')
        return
      }

      if (formData.quickDeliveryFeeSettings.type === '조건부 지원') {
        if (!formData.quickDeliveryFeeSettings.freeCondition || formData.quickDeliveryFeeSettings.freeCondition <= 0) {
          alert('조건부 지원 배송 시 최소 구매 금액을 입력해주세요.')
          return
        }
        if (formData.quickDeliveryFeeSettings.maxSupport === undefined || formData.quickDeliveryFeeSettings.maxSupport < 0) {
          alert('조건부 지원 배송 시 퀵 비용 지원액을 입력해주세요.')
          return
        }
      }
    }

    // 택배 배송 검사
    if (formData.deliveryMethods.includes('택배 배송')) {
      if (!formData.deliveryFeeSettings?.type) {
        alert('택배 배송 시 배송비 타입을 선택해주세요.')
        return
      }

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

      if (formData.deliveryFeeSettings.type === '유료') {
        if (!formData.deliveryFeeSettings.baseFee || formData.deliveryFeeSettings.baseFee <= 0) {
          alert('유료 배송 시 기본 배송비를 입력해주세요.')
          return
        }
      }

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

    setIsSubmitting(true)

    try {
      // 새로운 이미지 업로드 처리
      const uploadedImageUrls: string[] = [...formData.images]

      for (const imageFile of newImages) {
        const formDataToUpload = new FormData()
        formDataToUpload.append('file', imageFile)
        formDataToUpload.append('type', 'product')
        formDataToUpload.append('storeId', selectedStoreId)
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

      // 옵션 필터링
      const filteredOptions = formData.options
        .filter(option =>
          option.groupName.trim() !== '' &&
          option.values.some(v => v.name.trim() !== '')
        )
        .map(option => ({
          ...option,
          values: option.values.filter(v => v.name.trim() !== '')
        }))

      // 추가상품 옵션 필터링
      const filteredAdditionalOptions = formData.additionalOptions
        .filter(option =>
          option.groupName.trim() !== '' &&
          option.values.some(v => v.name.trim() !== '')
        )
        .map(option => ({
          ...option,
          values: option.values.filter(v => v.name.trim() !== '')
        }))

      // 선택된 스토어에서 partnerId 가져오기
      const selectedStore = stores.find(s => s.id === selectedStoreId)
      const partnerId = selectedStore?.partnerId || null

      // partnerId로 users 컬렉션에서 email 가져오기
      let partnerEmail: string | null = null
      if (partnerId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', partnerId))
          if (userDoc.exists()) {
            partnerEmail = userDoc.data().email || null
          }
        } catch (error) {
          console.error('파트너 이메일 조회 실패:', error)
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitData: any = {
        ...formData,
        images: uploadedImageUrls,
        storeId: selectedStoreId,
        partnerId,
        partnerEmail,
        optionsEnabled,
        options: filteredOptions,
        additionalOptionsEnabled,
        additionalOptions: filteredAdditionalOptions.length > 0 ? filteredAdditionalOptions : [],
        quickDeliveryFeeSettings: formData.deliveryMethods.includes('퀵업체 배송') ? formData.quickDeliveryFeeSettings : null,
        deliveryFeeSettings: formData.deliveryMethods.includes('택배 배송') ? formData.deliveryFeeSettings : null,
        updatedAt: new Date().toISOString(),
        updatedByAdmin: true
      }

      // 할인 데이터 처리
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
      } else {
        submitData.discount = null
        submitData.discountedPrice = null
      }

      await updateProduct(productId, submitData)
      alert('상품이 성공적으로 수정되었습니다!')
      router.push('/admin/products')

    } catch (error) {
      console.error('상품 수정 중 오류:', error)
      alert('상품 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.formCard}>
          <p>상품 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>상품 수정 (관리자)</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* 판매자 선택 (관리자 전용) */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>0</span>
              판매자 선택 <span className={styles.required}>*</span>
            </h2>
            <div className={styles.storeSelect}>
              {currentStoreName && (
                <p style={{ marginBottom: '8px', color: '#666', fontSize: '14px' }}>
                  현재 판매자: <strong>{currentStoreName}</strong>
                </p>
              )}
              {loadingStores ? (
                <p>판매자 목록 로딩 중...</p>
              ) : (
                <SearchableStoreSelect
                  stores={stores}
                  selectedStoreId={selectedStoreId}
                  onSelect={setSelectedStoreId}
                />
              )}
            </div>
          </div>

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
            categories={Array.isArray(formData.category) ? formData.category : [formData.category].filter(Boolean)}
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
            onToggle={(enabled) => {
              setOptionsEnabled(enabled)
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
            onShowHelpModal={() => setShowAdditionalProductHelpModal(true)}
            enabled={additionalOptionsEnabled}
            onToggle={(enabled) => {
              setAdditionalOptionsEnabled(enabled)
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
            storeId={selectedStoreId}
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
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? '수정 중...' : '상품 수정'}
            </button>
          </div>
        </form>
      </div>

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
