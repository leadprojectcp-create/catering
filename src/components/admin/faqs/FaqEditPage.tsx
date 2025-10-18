'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFaq, updateFaq, type FaqCategory } from '@/lib/services/faqService'
import { useAuth } from '@/contexts/AuthContext'
import CustomEditor from '@/components/common/CustomEditor'
import Loading from '@/components/Loading'
import styles from './FaqEditPage.module.css'

interface FaqEditPageProps {
  id: string
}

export default function FaqEditPage({ id }: FaqEditPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'store_account' as FaqCategory,
    order: 0,
    status: 'draft' as 'draft' | 'published'
  })

  useEffect(() => {
    fetchFaq()
  }, [id])

  const fetchFaq = async () => {
    try {
      setLoading(true)
      const faq = await getFaq(id)
      if (faq) {
        setFormData({
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          order: faq.order,
          status: faq.status
        })
      } else {
        alert('FAQ를 찾을 수 없습니다.')
        router.push('/admin/faqs')
      }
    } catch (error) {
      console.error('FAQ 로드 실패:', error)
      alert('FAQ를 불러오는데 실패했습니다.')
      router.push('/admin/faqs')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!formData.question || !formData.answer) {
      alert('질문과 답변은 필수 입력 항목입니다.')
      return
    }

    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setLoading(true)

    try {
      await updateFaq(id, {
        question: formData.question,
        answer: formData.answer,
        category: formData.category,
        order: formData.order,
        status
      })

      alert(status === 'published' ? 'FAQ가 게시되었습니다.' : '임시 저장되었습니다.')
      router.push('/admin/faqs')
    } catch (error) {
      console.error('FAQ 수정 실패:', error)
      alert('FAQ 수정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>FAQ 수정</h1>
        <button
          className={styles.cancelButton}
          onClick={() => router.push('/admin/faqs')}
        >
          취소
        </button>
      </div>

      <div className={styles.formContainer}>
        <div className={styles.formGroup}>
          <label className={styles.label}>카테고리 *</label>
          <select
            className={styles.select}
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as FaqCategory }))}
          >
            <option value="store_account">입점 및 계정 관리</option>
            <option value="order">주문</option>
            <option value="delivery">배송 및 수령</option>
            <option value="settlement">정산</option>
            <option value="review">리뷰</option>
            <option value="withdrawal">회원탈퇴</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>순서 *</label>
          <input
            type="number"
            className={styles.input}
            value={formData.order}
            onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
            placeholder="표시 순서 (낮을수록 먼저 표시)"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>질문 *</label>
          <input
            type="text"
            className={styles.input}
            value={formData.question}
            onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
            placeholder="자주 묻는 질문을 입력하세요"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>답변 *</label>
          <div className={styles.editorWrapper}>
            <CustomEditor
              value={formData.answer}
              onChange={(value) => setFormData(prev => ({ ...prev, answer: value }))}
            />
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.saveDraftButton}
            onClick={() => handleSubmit('draft')}
            disabled={loading}
          >
            임시 저장
          </button>
          <button
            className={styles.publishButton}
            onClick={() => handleSubmit('published')}
            disabled={loading}
          >
            게시하기
          </button>
        </div>
      </div>
    </div>
  )
}
