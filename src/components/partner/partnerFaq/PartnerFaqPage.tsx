'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getPublishedFaqs, type Faq, type FaqCategory } from '@/lib/services/faqService'
import Loading from '@/components/Loading'
import styles from './PartnerFaqPage.module.css'

export default function PartnerFaqPage() {
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | 'all'>('all')
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)

  useEffect(() => {
    fetchFaqs()
  }, [selectedCategory])

  const fetchFaqs = async () => {
    try {
      setLoading(true)
      const category = selectedCategory === 'all' ? undefined : selectedCategory
      const data = await getPublishedFaqs('partner', category)
      setFaqs(data)
    } catch (error) {
      console.error('FAQ 불러오기 실패:', error)
    } finally {
      setLoading(false)
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

  const toggleFaq = (faqId: string) => {
    setOpenFaqId(openFaqId === faqId ? null : faqId)
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>고객센터</h1>
      </div>

      <div className={styles.contactBox}>
        <div className={styles.contactInfo}>
          <div className={styles.phoneSection}>
            <div className={styles.phoneRow}>
              <img src="/icons/partner_faq_phone.png" alt="전화" className={styles.phoneIcon} />
              <div className={styles.phoneNumber}>1666-5157</div>
            </div>
            <div className={styles.phoneHours}>고객센터 : 오전 10시 ~ 오후 6시 운영</div>
          </div>
          <Link href="/chat" className={styles.chatButton}>
            <img src="/icons/partner_faq_chat.png" alt="채팅" className={styles.chatIcon} />
            <span>채팅문의</span>
          </Link>
        </div>
      </div>

      <h2 className={styles.faqTitle}>자주 묻는 질문</h2>

      <div className={styles.categoryTabs}>
        <button
          className={`${styles.categoryTab} ${selectedCategory === 'all' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          전체
        </button>
        <button
          className={`${styles.categoryTab} ${selectedCategory === 'store_account' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('store_account')}
        >
          입점 및 계정 관리
        </button>
        <button
          className={`${styles.categoryTab} ${selectedCategory === 'order' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('order')}
        >
          주문
        </button>
        <button
          className={`${styles.categoryTab} ${selectedCategory === 'delivery' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('delivery')}
        >
          배송 및 수령
        </button>
        <button
          className={`${styles.categoryTab} ${selectedCategory === 'settlement' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('settlement')}
        >
          정산
        </button>
        <button
          className={`${styles.categoryTab} ${selectedCategory === 'review' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('review')}
        >
          리뷰
        </button>
        <button
          className={`${styles.categoryTab} ${selectedCategory === 'withdrawal' ? styles.active : ''}`}
          onClick={() => setSelectedCategory('withdrawal')}
        >
          회원탈퇴
        </button>
      </div>

      <div className={styles.faqList}>
        {faqs.length === 0 ? (
          <div className={styles.empty}>등록된 FAQ가 없습니다.</div>
        ) : (
          faqs.map((faq) => (
            <div key={faq.id} className={styles.faqItem}>
              <div
                className={styles.faqQuestion}
                onClick={() => toggleFaq(faq.id)}
              >
                <div className={styles.questionContent}>
                  <span className={styles.categoryBadge}>
                    {getCategoryLabel(faq.category)}
                  </span>
                  <span className={styles.questionText}>{faq.question}</span>
                </div>
                <span className={`${styles.arrow} ${openFaqId === faq.id ? styles.open : ''}`}>
                  ▼
                </span>
              </div>
              {openFaqId === faq.id && (
                <div
                  className={styles.faqAnswer}
                  dangerouslySetInnerHTML={{ __html: faq.answer }}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
