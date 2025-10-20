'use client'

import { useState, useEffect } from 'react'
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
          <a href="http://pf.kakao.com/_xcvKtn/chat" target="_blank" rel="noopener noreferrer" className={styles.chatButton}>
            <img src="/icons/partner_faq_chat.png" alt="채팅" className={styles.chatIcon} />
            <span>채팅문의</span>
          </a>
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
                <img src="/icons/question.png" alt="Q" className={styles.questionIcon} />
                <div className={styles.questionContent}>
                  <span className={styles.categoryBadge}>
                    {getCategoryLabel(faq.category)}
                  </span>
                  <span className={styles.questionText}>{faq.question}</span>
                </div>
                <svg
                  className={`${styles.arrow} ${openFaqId === faq.id ? styles.open : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path d="M12.0021 14.9497C11.8687 14.9497 11.7437 14.9289 11.6271 14.8872C11.5104 14.8456 11.4021 14.7747 11.3021 14.6747L6.70206 10.0747C6.51873 9.89139 6.4229 9.66222 6.41456 9.38722C6.40623 9.11222 6.50206 8.87472 6.70206 8.67472C6.8854 8.49139 7.11873 8.39972 7.40206 8.39972C7.6854 8.39972 7.91873 8.49139 8.10206 8.67472L12.0021 12.5497L15.9021 8.67472C16.0854 8.49139 16.3146 8.39555 16.5896 8.38722C16.8646 8.37889 17.1021 8.47472 17.3021 8.67472C17.4854 8.85805 17.5771 9.09139 17.5771 9.37472C17.5771 9.65805 17.4854 9.89139 17.3021 10.0747L12.7021 14.6747C12.6021 14.7747 12.4937 14.8456 12.3771 14.8872C12.2604 14.9289 12.1354 14.9497 12.0021 14.9497Z" fill="#1B1C1F"/>
                </svg>
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
