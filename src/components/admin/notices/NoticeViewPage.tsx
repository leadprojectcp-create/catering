'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getNotice, incrementNoticeViewCount } from '@/lib/services/noticeService'
import type { Notice } from '@/types/notice'
import Loading from '@/components/Loading'
import styles from './NoticeViewPage.module.css'

interface NoticeViewPageProps {
  id: string
}

export default function NoticeViewPage({ id }: NoticeViewPageProps) {
  const router = useRouter()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotice()
  }, [id])

  const fetchNotice = async () => {
    try {
      setLoading(true)
      const data = await getNotice(id)
      if (data) {
        setNotice(data)
        await incrementNoticeViewCount(id)
      } else {
        alert('공지사항을 찾을 수 없습니다.')
        router.push('/admin/notices')
      }
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
      alert('공지사항을 불러오는데 실패했습니다.')
      router.push('/admin/notices')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: unknown) => {
    if (!date) return '-'
    const d = (date as { toDate?: () => Date })?.toDate ? (date as { toDate: () => Date }).toDate() : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTargetTypeLabel = (targetType: string) => {
    const labels = {
      all: '전체',
      partner: '파트너',
      user: '일반 유저'
    }
    return labels[targetType as keyof typeof labels] || '전체'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: '임시저장',
      published: '게시됨'
    }
    return labels[status as keyof typeof labels] || '임시저장'
  }

  if (loading) return <Loading />
  if (!notice) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>공지사항 상세보기</h1>
        <div className={styles.buttonGroup}>
          <button
            className={styles.editButton}
            onClick={() => router.push(`/admin/notices/edit/${id}`)}
          >
            수정
          </button>
          <button
            className={styles.backButton}
            onClick={() => router.push('/admin/notices')}
          >
            목록으로
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.infoSection}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>제목</span>
            <span className={styles.infoValue}>{notice.title}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>대상</span>
            <span className={styles.targetBadge}>{getTargetTypeLabel(notice.targetType)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>작성자</span>
            <span className={styles.infoValue}>{notice.author}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>상태</span>
            <span className={styles.statusBadge}>{getStatusLabel(notice.status)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>조회수</span>
            <span className={styles.infoValue}>{notice.viewCount || 0}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>게시일</span>
            <span className={styles.infoValue}>{formatDate(notice.publishedAt)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>작성일</span>
            <span className={styles.infoValue}>{formatDate(notice.createdAt)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>수정일</span>
            <span className={styles.infoValue}>{formatDate(notice.updatedAt)}</span>
          </div>
        </div>

        <div className={styles.contentSection}>
          <h2 className={styles.contentTitle}>내용</h2>
          <div
            className={styles.contentBody}
            dangerouslySetInnerHTML={{ __html: notice.content }}
          />
        </div>
      </div>
    </div>
  )
}
