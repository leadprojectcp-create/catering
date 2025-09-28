'use client'

import { useState } from 'react'
import styles from './AddProductPage.module.css'

interface ProductOption {
  optionName: string
  optionValues: string[]
  additionalPrices: { [key: string]: number }
}

interface ProductFormData {
  category: string
  orderType: 'single' | 'subscription'
  name: string
  mainImage: File | null
  additionalImages: File[]
  price: number
  discount: {
    enabled: boolean
    type: 'amount' | 'percentage'
    value: number
  }
  options: ProductOption[]
  description: string
  minOrderQuantity: number
  maxOrderQuantity: number
  deliveryMethod: 'delivery' | 'quick' | 'self'
  origin: {
    type: 'detail' | 'custom'
    customOrigins: { ingredient: string, origin: string }[]
  }
}

export default function AddProductPage() {
  const [formData, setFormData] = useState<ProductFormData>({
    category: '',
    orderType: 'single',
    name: '',
    mainImage: null,
    additionalImages: [],
    price: 0,
    discount: {
      enabled: false,
      type: 'amount',
      value: 0
    },
    options: [],
    description: '',
    minOrderQuantity: 10,
    maxOrderQuantity: 11,
    deliveryMethod: 'delivery',
    origin: {
      type: 'detail',
      customOrigins: []
    }
  })

  const availableCategories = [
    '케이터링 박스 / 플래터',
    '샌드위치 / 베이커리',
    '디저트 박스',
    '김밥 / 한식 도시락',
    '샐러드 / 과일 도시락',
    '음료 / 커피 / 차',
    '떡 / 전통한과 / 견과류'
  ]

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      category: e.target.value
    }))
  }

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [
        ...prev.options,
        { optionName: '', optionValues: [], additionalPrices: {} }
      ]
    }))
  }

  const updateOption = (index: number, field: keyof ProductOption, value: any) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      )
    }))
  }

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const addCustomOrigin = () => {
    setFormData(prev => ({
      ...prev,
      origin: {
        ...prev.origin,
        customOrigins: [...prev.origin.customOrigins, { ingredient: '', origin: '' }]
      }
    }))
  }

  const updateCustomOrigin = (index: number, field: 'ingredient' | 'origin', value: string) => {
    setFormData(prev => ({
      ...prev,
      origin: {
        ...prev.origin,
        customOrigins: prev.origin.customOrigins.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }
    }))
  }

  const removeCustomOrigin = (index: number) => {
    setFormData(prev => ({
      ...prev,
      origin: {
        ...prev.origin,
        customOrigins: prev.origin.customOrigins.filter((_, i) => i !== index)
      }
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Product data:', formData)
    // 상품 등록 로직 구현
  }

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>상품 등록</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
        {/* 카테고리 선택 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>카테고리 선택</h2>
          <select
            value={formData.category}
            onChange={handleCategoryChange}
            className={styles.textInput}
            required
          >
            <option value="">카테고리를 선택해주세요</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* 주문 타입 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>주문 타입</h2>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="orderType"
                value="single"
                checked={formData.orderType === 'single'}
                onChange={(e) => setFormData(prev => ({ ...prev, orderType: e.target.value as 'single' | 'subscription' }))}
                className={styles.radioInput}
              />
              단건주문
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="orderType"
                value="subscription"
                checked={formData.orderType === 'subscription'}
                onChange={(e) => setFormData(prev => ({ ...prev, orderType: e.target.value as 'single' | 'subscription' }))}
                className={styles.radioInput}
              />
              정기배송
            </label>
          </div>
        </div>

        {/* 상품명 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>상품명</h2>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="상품명을 입력하세요 (100자 이내)"
            maxLength={100}
            className={styles.textInput}
            required
          />
          <p className={styles.textCounter}>{formData.name.length}/100자</p>
        </div>

        {/* 상품이미지 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>상품이미지</h2>
          <div className={styles.imageSection}>
            <div className={styles.imageGroup}>
              <label className={styles.sectionTitle}>대표이미지</label>
              <div className={styles.imageUploadContainer}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData(prev => ({ ...prev, mainImage: e.target.files?.[0] || null }))}
                  className={styles.fileInput}
                  id="mainImage"
                  required
                />
                <label htmlFor="mainImage" className={styles.fileLabel}>
                  {formData.mainImage ? '파일 변경' : '파일을 선택해주세요'}
                </label>
                <label htmlFor="mainImage" className={styles.uploadButton}>
                  파일업로드
                </label>
              </div>
            </div>
            <div className={styles.imageGroup}>
              <label className={styles.sectionTitle}>추가이미지</label>
              <div className={styles.imageUploadContainer}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFormData(prev => ({ ...prev, additionalImages: Array.from(e.target.files || []) }))}
                  className={styles.fileInput}
                  id="additionalImages"
                />
                <label htmlFor="additionalImages" className={styles.fileLabel}>
                  {formData.additionalImages.length > 0 ? `${formData.additionalImages.length}개 파일 선택됨` : '파일을 선택해주세요'}
                </label>
                <label htmlFor="additionalImages" className={styles.uploadButton}>
                  파일업로드
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 판매가 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>판매가</h2>
          <div className={styles.priceSection}>
            <div>
              <label className={styles.sectionTitle}>판매가</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                placeholder="판매가를 입력하세요"
                className={styles.textInput}
                required
              />
            </div>
            <div>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.discount.enabled}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    discount: { ...prev.discount, enabled: e.target.checked }
                  }))}
                  className={styles.checkboxInput}
                />
                즉시할인 설정
              </label>
              {formData.discount.enabled && (
                <div className={styles.discountControls}>
                  <select
                    value={formData.discount.type}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      discount: { ...prev.discount, type: e.target.value as 'amount' | 'percentage' }
                    }))}
                  >
                    <option value="amount">원</option>
                    <option value="percentage">%</option>
                  </select>
                  <input
                    type="number"
                    value={formData.discount.value}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      discount: { ...prev.discount, value: Number(e.target.value) }
                    }))}
                    placeholder="할인값"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 옵션 선택 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>옵션 선택</h2>
          {formData.options.map((option, index) => (
            <div key={index} className={styles.optionCard}>
              <div className={styles.optionHeader}>
                <h3 className={styles.optionTitle}>옵션 {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className={styles.removeButton}
                >
                  삭제
                </button>
              </div>
              <div className={styles.optionInputs}>
                <input
                  type="text"
                  placeholder="옵션명"
                  value={option.optionName}
                  onChange={(e) => updateOption(index, 'optionName', e.target.value)}
                  className={styles.textInput}
                />
                <input
                  type="text"
                  placeholder="옵션값 (콤마로 구분)"
                  value={option.optionValues.join(', ')}
                  onChange={(e) => updateOption(index, 'optionValues', e.target.value.split(',').map(v => v.trim()))}
                  className={styles.textInput}
                />
                {option.optionValues.length > 0 && (
                  <div className={styles.optionTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>옵션명</th>
                          <th>옵션값</th>
                          <th>추가금액</th>
                          <th>삭제</th>
                        </tr>
                      </thead>
                      <tbody>
                        {option.optionValues.map((value, valueIndex) => (
                          <tr key={valueIndex}>
                            {valueIndex === 0 && (
                              <td rowSpan={option.optionValues.length}>{option.optionName}</td>
                            )}
                            <td>{value}</td>
                            <td>
                              <input
                                type="number"
                                placeholder="0"
                                value={option.additionalPrices[value] || ''}
                                onChange={(e) => {
                                  const newPrices = { ...option.additionalPrices }
                                  newPrices[value] = Number(e.target.value)
                                  updateOption(index, 'additionalPrices', newPrices)
                                }}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => {
                                  const newValues = option.optionValues.filter((_, i) => i !== valueIndex)
                                  const newPrices = { ...option.additionalPrices }
                                  delete newPrices[value]
                                  updateOption(index, 'optionValues', newValues)
                                  updateOption(index, 'additionalPrices', newPrices)
                                }}
                                className={styles.removeButton}
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className={styles.addButton}
          >
            옵션 추가
          </button>
        </div>

        {/* 상세설명 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>상세설명</h2>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="상품에 대한 상세한 설명을 입력하세요"
            rows={10}
            className={styles.textarea}
          />
        </div>

        {/* 주문수량 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>주문수량</h2>
          <div className={styles.quantityGrid}>
            <div className={styles.quantityGroup}>
              <label className={styles.sectionTitle}>최소 주문수량</label>
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
            </div>
            <div className={styles.quantityGroup}>
              <label className={styles.sectionTitle}>최대 주문수량</label>
              <input
                type="number"
                value={formData.maxOrderQuantity}
                onChange={(e) => setFormData(prev => ({ ...prev, maxOrderQuantity: Number(e.target.value) }))}
                min="11"
                className={styles.textInput}
              />
            </div>
          </div>
        </div>

        {/* 배송방법 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>배송방법</h2>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryMethod"
                value="delivery"
                checked={formData.deliveryMethod === 'delivery'}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryMethod: e.target.value as 'delivery' | 'quick' | 'self' }))}
                className={styles.radioInput}
              />
              택배
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryMethod"
                value="quick"
                checked={formData.deliveryMethod === 'quick'}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryMethod: e.target.value as 'delivery' | 'quick' | 'self' }))}
                className={styles.radioInput}
              />
              퀵
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryMethod"
                value="self"
                checked={formData.deliveryMethod === 'self'}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryMethod: e.target.value as 'delivery' | 'quick' | 'self' }))}
                className={styles.radioInput}
              />
              자체배달
            </label>
          </div>
        </div>

        {/* 원산지 표기 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>원산지 표기</h2>
          <div className={styles.originControls}>
            <div className={styles.originRadios}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="originType"
                  value="detail"
                  checked={formData.origin.type === 'detail'}
                  onChange={() => setFormData(prev => ({
                    ...prev,
                    origin: { ...prev.origin, type: 'detail' }
                  }))}
                  className={styles.radioInput}
                />
                상품상세참조
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="originType"
                  value="custom"
                  checked={formData.origin.type === 'custom'}
                  onChange={() => setFormData(prev => ({
                    ...prev,
                    origin: { ...prev.origin, type: 'custom' }
                  }))}
                  className={styles.radioInput}
                />
                추가 사항 입력
              </label>
            </div>

            {formData.origin.type === 'custom' && (
              <div className={styles.customOrigins}>
                {formData.origin.customOrigins.map((item, index) => (
                  <div key={index} className={styles.originRow}>
                    <input
                      type="text"
                      placeholder="재료명"
                      value={item.ingredient}
                      onChange={(e) => updateCustomOrigin(index, 'ingredient', e.target.value)}
                    />
                    <span className={styles.originSeparator}>-</span>
                    <input
                      type="text"
                      placeholder="원산지"
                      value={item.origin}
                      onChange={(e) => updateCustomOrigin(index, 'origin', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomOrigin(index)}
                      className={styles.removeButton}
                    >
                      삭제
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCustomOrigin}
                  className={styles.grayButton}
                >
                  원산지 정보 추가
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className={styles.submitContainer}>
          <button
            type="submit"
            className={styles.submitButton}
          >
            상품 등록
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}