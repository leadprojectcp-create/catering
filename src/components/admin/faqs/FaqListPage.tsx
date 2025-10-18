'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFaqs, deleteFaq, type Faq } from '@/lib/services/faqService'
import Loading from '@/components/Loading'
import styles from './FaqListPage.module.css'

export default function FaqListPage() {
  const router = useRouter()
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    fetchFaqs()
  }, [filterStatus, filterCategory])

  const fetchFaqs = async () => {
    try {
      setLoading(true)
      const data = await getFaqs(filterStatus, filterCategory)
      setFaqs(data)
    } catch (error) {
      console.error('FAQ 목록 불러오기 실패:', error)
      alert('FAQ 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      await deleteFaq(id)
      alert('삭제되었습니다.')
      fetchFaqs()
    } catch (error) {
      console.error('FAQ 삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      store_account: '입점 및 계정 관리',
      order: '주문',
      delivery: '배송 및 수령',
      settlement: '정산',
      review: '리뷰',
      withdrawal: '회원탈퇴'
    }
    return labels[category] || category
  }

  const getCategoryClass = (category: string) => {
    const classes: Record<string, string> = {
      store_account: styles.categoryGeneral,
      order: styles.categoryOrder,
      delivery: styles.categoryDelivery,
      settlement: styles.categoryPayment,
      review: styles.categoryProduct,
      withdrawal: styles.categoryAccount
    }
    return classes[category] || styles.categoryGeneral
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>FAQ 관리</h1>
        <button
          className={styles.writeButton}
          onClick={() => router.push('/admin/faqs/write')}
        >
          FAQ 작성
        </button>
      </div>

      <div className={styles.filters}>
        <select
          className={styles.select}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="published">게시됨</option>
          <option value="draft">임시저장</option>
        </select>

        <select
          className={styles.select}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">전체 카테고리</option>
          <option value="store_account">입점 및 계정 관리</option>
          <option value="order">주문</option>
          <option value="delivery">배송 및 수령</option>
          <option value="settlement">정산</option>
          <option value="review">리뷰</option>
          <option value="withdrawal">회원탈퇴</option>
        </select>
      </div>

      {faqs.length === 0 ? (
        <div className={styles.empty}>등록된 FAQ가 없습니다.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>순서</th>
              <th style={{ width: '80px' }}>대상</th>
              <th style={{ width: '120px' }}>카테고리</th>
              <th>질문</th>
              <th style={{ width: '100px' }}>상태</th>
              <th style={{ width: '100px' }}>작성자</th>
              <th style={{ width: '150px' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {faqs.map((faq) => (
              <tr
                key={faq.id}
                onClick={() => router.push(`/admin/faqs/view/${faq.id}`)}
              >
                <td>{faq.order}</td>
                <td>
                  {faq.targetType === 'all' ? '전체' : faq.targetType === 'user' ? '일반' : '파트너'}
                </td>
                <td>
                  <span className={`${styles.categoryBadge} ${getCategoryClass(faq.category)}`}>
                    {getCategoryLabel(faq.category)}
                  </span>
                </td>
                <td>{faq.question}</td>
                <td>
                  <span className={`${styles.statusBadge} ${faq.status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
                    {faq.status === 'published' ? '게시됨' : '임시저장'}
                  </span>
                </td>
                <td>{faq.author}</td>
                <td>
                  <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={styles.editButton}
                      onClick={() => router.push(`/admin/faqs/edit/${faq.id}`)}
                    >
                      수정
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDelete(faq.id)}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
