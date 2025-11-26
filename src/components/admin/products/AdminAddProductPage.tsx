'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createProduct } from '@/lib/services/productService'
import OptionHelpModal from '@/components/partner/product/common/modals/OptionHelpModal'
import AdditionalProductHelpModal from '@/components/partner/product/common/modals/AdditionalProductHelpModal'
import ImageUploadSection from '@/components/partner/product/sections/ImageUploadSection'
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

export default function AdminAddProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tempProductId] = useState(() => `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`)
  const [showOptionHelpModal, setShowOptionHelpModal] = useState(false)
  const [showAdditionalProductHelpModal, setShowAdditionalProductHelpModal] = useState(false)
  const [optionsEnabled, setOptionsEnabled] = useState(false)
  const [additionalOptionsEnabled, setAdditionalOptionsEnabled] = useState(false)

  // 관리자 전용: 스토어 선택
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [loadingStores, setLoadingStores] = useState(true)

  const [formData, setFormData] = useState<ProductFormData>({
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

  // Handle cancel
  const handleCancel = () => {
    if (confirm('작성중인 내용이 삭제됩니다. 취소하시겠습니까?')) {
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
    if (formData.images.length === 0) {
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
      // 이미지 업로드 처리
      const uploadedImageUrls: string[] = []

      for (const imageFile of formData.images) {
        const formDataToUpload = new FormData()
        formDataToUpload.append('file', imageFile)
        formDataToUpload.append('type', 'product')
        formDataToUpload.append('storeId', selectedStoreId)
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
        storeId: selectedStoreId, // 관리자가 선택한 스토어 ID
        partnerId,
        partnerEmail,
        optionsEnabled,
        options: filteredOptions,
        additionalOptionsEnabled,
        additionalOptions: filteredAdditionalOptions.length > 0 ? filteredAdditionalOptions : undefined,
        orderType: 'single',
        quickDeliveryFeeSettings: formData.deliveryMethods.includes('퀵업체 배송') ? formData.quickDeliveryFeeSettings : undefined,
        deliveryFeeSettings: formData.deliveryMethods.includes('택배 배송') ? formData.deliveryFeeSettings : undefined,
        status: 'active', // 관리자가 등록하면 바로 활성화
        createdAt: new Date().toISOString(),
        createdByAdmin: true // 관리자가 등록했음을 표시
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
      }

      await createProduct(submitData)
      alert('상품이 성공적으로 등록되었습니다!')
      router.push('/admin/products')

    } catch (error) {
      console.error('상품 등록 중 오류:', error)
      alert(error instanceof Error ? error.message : '상품 등록 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>상품 등록 (관리자)</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* 판매자 선택 (관리자 전용) */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionNumber}>0</span>
              판매자 선택 <span className={styles.required}>*</span>
            </h2>
            <div className={styles.storeSelect}>
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
            storeId={selectedStoreId}
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
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? '등록 중...' : '상품 등록'}
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
