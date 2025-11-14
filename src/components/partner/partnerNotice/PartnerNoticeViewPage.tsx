'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getNotice } from '@/lib/services/partnerNoticeService'
import type { Notice } from '@/lib/services/partnerNoticeService'
import Loading from '@/components/Loading'
import styles from './PartnerNoticeViewPage.module.css'

interface NoticeViewPageProps {
  noticeId: string
}

export default function NoticeViewPage({ noticeId }: NoticeViewPageProps) {
  const router = useRouter()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotice()
  }, [noticeId])

  const loadNotice = async () => {
    try {
      const data = await getNotice(noticeId)
      setNotice(data)
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
      alert('공지사항을 불러오는데 실패했습니다.')
      router.push('/partner/partnerNotice/management')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: unknown) => {
    if (!date) return '-'
    const d = (date as { toDate?: () => Date })?.toDate ? (date as { toDate: () => Date }) : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { label: '임시저장', className: styles.badgeDraft },
      published: { label: '게시됨', className: styles.badgePublished },
      archived: { label: '보관됨', className: styles.badgeArchived }
    }
    const badge = badges[status as keyof typeof badges] || badges.draft
    return <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
  }

  if (loading) return <Loading />
  if (!notice) return <div>공지사항을 찾을 수 없습니다.</div>

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.backButton} onClick={() => router.push('/partner/partnerNotice/management')}>
          ← 목록으로
        </div>
        <div className={styles.actions}>
          <button
            className={styles.editButton}
            onClick={() => router.push(`/partner/notice/edit/${noticeId}`)}
          >
            수정
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.meta}>
          {getStatusBadge(notice.status)}
        </div>

        <h1 className={styles.title}>{notice.title}</h1>

        <div className={styles.info}>
          <span>작성자: {notice.author}</span>
          <span>•</span>
          <span>{formatDate(notice.publishedAt || notice.createdAt)}</span>
          <span>•</span>
          <span>조회 {notice.viewCount || 0}</span>
        </div>

        <div className={styles.divider} />

        <div
          className={styles.articleContent}
          dangerouslySetInnerHTML={{ __html: notice.content }}
        />
      </div>
    </div>
  )
}
