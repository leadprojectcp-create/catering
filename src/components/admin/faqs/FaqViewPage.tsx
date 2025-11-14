'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFaq, deleteFaq, type Faq, type FaqCategory } from '@/lib/services/faqService'
import Loading from '@/components/Loading'
import styles from './FaqViewPage.module.css'

interface FaqViewPageProps {
  id: string
}

export default function FaqViewPage({ id }: FaqViewPageProps) {
  const router = useRouter()
  const [faq, setFaq] = useState<Faq | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFaq()
  }, [id])

  const fetchFaq = async () => {
    try {
      setLoading(true)
      const data = await getFaq(id)
      if (data) {
        setFaq(data)
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

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      await deleteFaq(id)
      alert('삭제되었습니다.')
      router.push('/admin/faqs')
    } catch (error) {
      console.error('FAQ 삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const getCategoryLabel = (category: FaqCategory) => {
    const labels: Record<FaqCategory, string> = {
      store_account: '입점 및 계정 관리',
      order: '주문',
      delivery: '배송 및 수령',
      settlement: '정산',
      review: '리뷰',
      withdrawal: '회원탈퇴'
    }
    return labels[category]
  }

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return ''
    const date = new Date(timestamp as string)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) return <Loading />
  if (!faq) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>FAQ 상세</h1>
        <div className={styles.buttonGroup}>
          <button
            className={styles.editButton}
            onClick={() => router.push(`/admin/faqs/edit/${id}`)}
          >
            수정
          </button>
          <button
            className={styles.deleteButton}
            onClick={handleDelete}
          >
            삭제
          </button>
          <button
            className={styles.listButton}
            onClick={() => router.push('/admin/faqs')}
          >
            목록
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.infoSection}>
          <div className={styles.infoRow}>
            <span className={styles.label}>대상:</span>
            <span className={styles.value}>
              {faq.targetType === 'all' ? '전체' : faq.targetType === 'user' ? '일반 유저' : '파트너'}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>카테고리:</span>
            <span className={styles.value}>{getCategoryLabel(faq.category)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>순서:</span>
            <span className={styles.value}>{faq.order}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>상태:</span>
            <span className={styles.value}>
              {faq.status === 'published' ? '게시됨' : '임시저장'}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>작성자:</span>
            <span className={styles.value}>{faq.author}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>작성일:</span>
            <span className={styles.value}>{formatDate(faq.createdAt)}</span>
          </div>
          {faq.updatedAt && (
            <div className={styles.infoRow}>
              <span className={styles.label}>수정일:</span>
              <span className={styles.value}>{formatDate(faq.updatedAt)}</span>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>질문</h2>
          <div className={styles.sectionContent}>
            {faq.question}
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>답변</h2>
          <div
            className={styles.sectionContent}
            dangerouslySetInnerHTML={{ __html: faq.answer }}
          />
        </div>
      </div>
    </div>
  )
}
