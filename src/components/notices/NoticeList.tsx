'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Timestamp } from 'firebase/firestore'
import { getPublishedNotices, type Notice } from '@/lib/services/noticeService'
import styles from './NoticeList.module.css'

export default function NoticeList() {
  const router = useRouter()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  useEffect(() => {
    loadNotices()
  }, [])

  const loadNotices = async () => {
    try {
      setLoading(true)
      // 고객용 공지사항 가져오기 (targetType: 'user' 또는 'all')
      const data = await getPublishedNotices('user')
      setNotices(data)
    } catch (error) {
      console.error('공지사항 목록 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNoticeClick = (id: string | undefined) => {
    if (!id) return
    router.push(`/notices/${id}`)
  }

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return ''
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp as string)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 페이지네이션 계산
  const totalPages = Math.ceil(notices.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentNotices = notices.slice(startIndex, endIndex)

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>공지사항</h1>
        <p className={styles.subtitle}>단모의 최신 소식과 안내를 확인하세요.</p>
      </div>

      {loading ? (
        <div className={styles.loading}>로딩 중...</div>
      ) : notices.length === 0 ? (
        <div className={styles.empty}>공지사항이 없습니다.</div>
      ) : (
        <>
          <div className={styles.noticeList}>
            {currentNotices.map((notice) => (
              <div
                key={notice.id}
                className={styles.noticeItem}
                onClick={() => handleNoticeClick(notice.id)}
              >
                <div className={styles.noticeHeader}>
                  <div className={styles.titleWrapper}>
                    <span className={styles.categoryBadge}>
                      {notice.category === 'event' ? '이벤트' : '일반'}
                    </span>
                    <h3 className={styles.noticeTitle}>{notice.title}</h3>
                  </div>
                  <span className={styles.noticeDate}>
                    {formatDate(notice.publishedAt)}
                  </span>
                </div>
                {notice.summary && (
                  <p className={styles.noticeSummary}>{notice.summary}</p>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              {currentPage > 1 && (
                <button
                  className={styles.arrowButton}
                  onClick={handlePrevPage}
                  aria-label="이전 페이지"
                >
                  ←
                </button>
              )}

              <div className={styles.pageNumbers}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`${styles.pageButton} ${currentPage === page ? styles.pageButtonActive : ''}`}
                    onClick={() => handlePageClick(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {currentPage < totalPages && (
                <button
                  className={styles.arrowButton}
                  onClick={handleNextPage}
                  aria-label="다음 페이지"
                >
                  →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
