'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getNotice, incrementNoticeViewCount, getPublishedNotices, type Notice } from '@/lib/services/noticeService'
import styles from './NoticeDetail.module.css'

interface NoticeDetailProps {
  noticeId: string
}

export default function NoticeDetail({ noticeId }: NoticeDetailProps) {
  const router = useRouter()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [prevNoticeId, setPrevNoticeId] = useState<string | null>(null)
  const [nextNoticeId, setNextNoticeId] = useState<string | null>(null)

  useEffect(() => {
    loadNotice()
  }, [noticeId])

  const loadNotice = async () => {
    try {
      setLoading(true)
      const data = await getNotice(noticeId)

      if (!data || data.status !== 'published') {
        alert('존재하지 않거나 공개되지 않은 공지사항입니다.')
        router.push('/partner/notice')
        return
      }

      setNotice(data)

      // 조회수 증가
      await incrementNoticeViewCount(noticeId)

      // 이전글/다음글 찾기
      const allNotices = await getPublishedNotices('partner')
      const currentIndex = allNotices.findIndex(n => n.id === noticeId)

      if (currentIndex > 0) {
        setNextNoticeId(allNotices[currentIndex - 1].id || null)
      } else {
        setNextNoticeId(null)
      }

      if (currentIndex < allNotices.length - 1 && currentIndex !== -1) {
        setPrevNoticeId(allNotices[currentIndex + 1].id || null)
      } else {
        setPrevNoticeId(null)
      }
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
      alert('공지사항을 불러오는데 실패했습니다.')
      router.push('/partner/notice')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return ''
    const date = new Date(timestamp as string)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  if (!notice) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.categoryBadge}>
            {notice.category === 'event' ? '이벤트' : '일반'}
          </span>
          <h1 className={styles.title}>{notice.title}</h1>
          <div className={styles.meta}>
            <span className={styles.date}>{formatDate(notice.publishedAt)}</span>
          </div>
        </div>

        {notice.summary && (
          <div className={styles.summary}>{notice.summary}</div>
        )}

        <div
          className={styles.body}
          dangerouslySetInnerHTML={{ __html: notice.content }}
        />

        <div className={styles.footer}>
          <button
            className={styles.navButton}
            onClick={() => prevNoticeId && router.push(`/partner/notice/${prevNoticeId}`)}
            disabled={!prevNoticeId}
          >
            이전글
          </button>
          <button
            className={styles.navButton}
            onClick={() => router.push('/partner/notice')}
          >
            목록으로
          </button>
          <button
            className={styles.navButton}
            onClick={() => nextNoticeId && router.push(`/partner/notice/${nextNoticeId}`)}
            disabled={!nextNoticeId}
          >
            다음글
          </button>
        </div>
      </div>
    </div>
  )
}
