'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore'
import styles from './SurveyPage.module.css'

interface SurveyFormData {
  productTypes: string[]
  bulkOrderExperience: string
  difficulties: string[]
  difficultiesOther: string
  orderManagement: string
  deliveryMethod: string
  aiRecommendation: string
  feeStructure: string
  feeStructureOther: string
  importantSupport: string
  importantSupportOther: string
  suggestions: string
  instagramScreenshot: File | null
}

export default function SurveyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [formData, setFormData] = useState<SurveyFormData>({
    productTypes: [],
    bulkOrderExperience: '',
    difficulties: [],
    difficultiesOther: '',
    orderManagement: '',
    deliveryMethod: '',
    aiRecommendation: '',
    feeStructure: '',
    feeStructureOther: '',
    importantSupport: '',
    importantSupportOther: '',
    suggestions: '',
    instagramScreenshot: null
  })

  const handleCheckboxChange = (field: 'productTypes' | 'difficulties', value: string) => {
    setFormData(prev => {
      const currentValues = prev[field]
      if (currentValues.includes(value)) {
        return { ...prev, [field]: currentValues.filter(v => v !== value) }
      } else {
        return { ...prev, [field]: [...currentValues, value] }
      }
    })
  }

  const handleRadioChange = (field: keyof SurveyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTextChange = (field: keyof SurveyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, instagramScreenshot: file }))
    }
  }

  const handleSubmit = async () => {
    // 필수 항목 체크
    if (formData.productTypes.length === 0) {
      alert('판매 중인 상품 종류를 선택해주세요.')
      return
    }
    if (!formData.bulkOrderExperience) {
      alert('단체주문 경험을 선택해주세요.')
      return
    }
    if (formData.difficulties.length === 0) {
      alert('어려운 점을 선택해주세요.')
      return
    }
    if (!formData.orderManagement) {
      alert('주문 관리 방법을 선택해주세요.')
      return
    }
    if (!formData.deliveryMethod) {
      alert('배송 방식을 선택해주세요.')
      return
    }
    if (!formData.aiRecommendation) {
      alert('AI 추천 시스템에 대한 의견을 선택해주세요.')
      return
    }
    if (!formData.feeStructure) {
      alert('수수료 구조에 대한 의견을 선택해주세요.')
      return
    }
    if (!formData.importantSupport) {
      alert('중요한 지원 요소를 선택해주세요.')
      return
    }
    if (!formData.suggestions.trim()) {
      alert('단모에 바라는 점이나 제안사항을 입력해주세요.')
      return
    }
    if (!formData.instagramScreenshot) {
      alert('인스타그램 팔로우 인증 캡쳐사진을 첨부해주세요.')
      return
    }

    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      // 설문조사 데이터 저장
      const surveyData = {
        userId: user.uid,
        productTypes: formData.productTypes,
        bulkOrderExperience: formData.bulkOrderExperience,
        difficulties: formData.difficulties,
        difficultiesOther: formData.difficultiesOther,
        orderManagement: formData.orderManagement,
        deliveryMethod: formData.deliveryMethod,
        aiRecommendation: formData.aiRecommendation,
        feeStructure: formData.feeStructure,
        feeStructureOther: formData.feeStructureOther,
        importantSupport: formData.importantSupport,
        importantSupportOther: formData.importantSupportOther,
        suggestions: formData.suggestions,
        instagramScreenshotName: formData.instagramScreenshot?.name || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // surveys 컬렉션에 저장
      await addDoc(collection(db, 'surveys'), surveyData)

      // users 컬렉션에 survey 완료 표시
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        survey: true,
        surveyCompletedAt: new Date()
      })

      alert('설문조사가 완료되었습니다. 소중한 의견 감사합니다!')
      router.back()
    } catch (error) {
      console.error('Survey submission error:', error)
      alert('설문조사 제출 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  const handleCancel = () => {
    if (confirm('작성 중인 내용이 사라집니다. 취소하시겠습니까?')) {
      router.back()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.banner}>
        <div className={styles.bannerText}>
          단모 파트너 설문조사{'\n'}참여하기
        </div>
      </div>
      <div className={styles.content}>
        {/* 질문 1 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            1. 현재 어떤 종류의 상품을 판매하고 계신가요?
          </h3>
          <div className={styles.checkboxGroup}>
            {['김밥', '도시락', '샌드위치', '디저트', '답례품', '기타'].map(option => (
              <label key={option} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.productTypes.includes(option)}
                  onChange={() => handleCheckboxChange('productTypes', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 질문 2 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            2. 단체주문(10개 이상)을 받은 경험이 있나요?
          </h3>
          <div className={styles.radioGroup}>
            {['자주 있다', '가끔 있다', '거의 없다', '없다'].map(option => (
              <label key={option} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="bulkOrderExperience"
                  checked={formData.bulkOrderExperience === option}
                  onChange={() => handleRadioChange('bulkOrderExperience', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 질문 3 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            3. 단체주문을 받을 때 가장 어려운 점은 무엇인가요? (복수선택 가능)
          </h3>
          <div className={styles.checkboxGroup}>
            {[
              '고객과의 소통(날짜/시간 조율)',
              '최소 수량/가격 협의',
              '결제 및 환불 처리',
              '포장 및 배송 부담',
              '주문 취소 시 손실',
              '기타(직접입력)'
            ].map(option => (
              <label key={option} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.difficulties.includes(option)}
                  onChange={() => handleCheckboxChange('difficulties', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {formData.difficulties.includes('기타(직접입력)') && (
            <textarea
              className={styles.textarea}
              placeholder="작성하실 내용을 입력해주세요."
              value={formData.difficultiesOther}
              onChange={(e) => handleTextChange('difficultiesOther', e.target.value)}
            />
          )}
        </div>

        {/* 질문 4 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            4. 현재 사용 중인 주문 관리 방법은 무엇인가요?
          </h3>
          <div className={styles.radioGroup}>
            {['전화/문자', '카카오톡', '배달 플랫폼', '직접 방문 주문', '기타'].map(option => (
              <label key={option} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="orderManagement"
                  checked={formData.orderManagement === option}
                  onChange={() => handleRadioChange('orderManagement', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 질문 5 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            5. 배송 방식 중 어떤 것이 가장 효율적이라고 생각하시나요?
          </h3>
          <div className={styles.radioGroup}>
            {['매장픽업', '퀵 배송', '택배 배송'].map(option => (
              <label key={option} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={formData.deliveryMethod === option}
                  onChange={() => handleRadioChange('deliveryMethod', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 질문 6 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            6. 단모는 고객이 있는 지역과 주문 패턴에 따라 AI가 자동으로 상품을 추천하는 시스템을 도입할 예정입니다. 이런 방식에 대해 어떻게 생각하시나요?
          </h3>
          <div className={styles.radioGroup}>
            {[
              '매우좋다 - 광고비 없이 노출이 가능해서',
              '좋다 - 효율적인 노출방식이라 생각한다',
              '보통이다 - 직접 노출 방식이 더 좋을 것 같다',
              '잘 모르겠다'
            ].map(option => (
              <label key={option} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="aiRecommendation"
                  checked={formData.aiRecommendation === option}
                  onChange={() => handleRadioChange('aiRecommendation', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 질문 7 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            7. 단모는 수수료 7%(카드수수료 포함) 외에 추가 광고비가 전혀 없는 구조입니다. 즉, 배달앱처럼 별도 광고비나 상단 노출비가 없습니다. 이 구조에 대해서 어떻게 생각하시나요?
          </h3>
          <div className={styles.radioGroup}>
            {[
              '명확해서 좋다',
              '카드수수료 포함이라 합리적이다',
              '수수료가 조금 높게 느껴진다',
              '기타 (직접입력)'
            ].map(option => (
              <label key={option} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="feeStructure"
                  checked={formData.feeStructure === option}
                  onChange={() => handleRadioChange('feeStructure', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {formData.feeStructure === '기타 (직접입력)' && (
            <textarea
              className={styles.textarea}
              placeholder="작성하실 내용을 입력해주세요."
              value={formData.feeStructureOther}
              onChange={(e) => handleTextChange('feeStructureOther', e.target.value)}
            />
          )}
        </div>

        {/* 질문 8 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            8. 단체주문 플랫폼에서 가장 중요한 지원 요소는 무엇이라 생각하시나요?
          </h3>
          <div className={styles.radioGroup}>
            {[
              '주문 관리 시스템',
              'AI 자동 노출(추천)',
              '배송 연동 서비스',
              '리뷰/평점 관리',
              '정산의 투명성',
              '기타 (직접입력)'
            ].map(option => (
              <label key={option} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="importantSupport"
                  checked={formData.importantSupport === option}
                  onChange={() => handleRadioChange('importantSupport', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {formData.importantSupport === '기타 (직접입력)' && (
            <textarea
              className={styles.textarea}
              placeholder="작성하실 내용을 입력해주세요."
              value={formData.importantSupportOther}
              onChange={(e) => handleTextChange('importantSupportOther', e.target.value)}
            />
          )}
        </div>

        {/* 질문 9 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            9. 단모에 바라는 점이나 제안사항을 자유롭게 적어주세요.
          </h3>
          <textarea
            className={styles.textarea}
            placeholder="작성하실 내용을 입력해주세요."
            value={formData.suggestions}
            onChange={(e) => handleTextChange('suggestions', e.target.value)}
            rows={5}
          />
        </div>

        {/* 질문 10 */}
        <div className={styles.question}>
          <h3 className={styles.questionTitle}>
            10. 단모 인스타그램 팔로우 인증 캡쳐사진을 첨부해주세요.
          </h3>
          <a
            href="https://www.instagram.com/danmo_official/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.instagramLink}
          >
            단모 인스타그램 바로가기 &gt;
          </a>
          <div className={styles.fileInputWrapper}>
            <div className={styles.fileUploadInputWrapper}>
              <input
                type="text"
                className={styles.readOnlyInput}
                value={formData.instagramScreenshot ? formData.instagramScreenshot.name : '파일을 첨부해주세요'}
                readOnly
              />
              <button
                type="button"
                className={styles.fileAttachButton}
                onClick={() => document.getElementById('instagram-file-input')?.click()}
              >
                파일 첨부
              </button>
              <input
                id="instagram-file-input"
                type="file"
                accept="image/*"
                className={styles.hiddenFileInput}
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.buttons}>
        <button className={styles.cancelButton} onClick={handleCancel}>
          취소
        </button>
        <button className={styles.submitButton} onClick={handleSubmit}>
          완료
        </button>
      </div>
    </div>
  )
}
