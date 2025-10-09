'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPartnerNotices, deleteNotice } from '@/lib/services/noticeService'
import { useAuth } from '@/contexts/AuthContext'
import type { Notice } from '@/lib/services/noticeService'
import Loading from '@/components/Loading'
import styles from './NoticeListPage.module.css'

export default function NoticeListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    if (user) {
      fetchNotices()
    }
  }, [filterStatus, user])

  const fetchNotices = async () => {
    if (!user) return

    try {
      setLoading(true)
      const data = await getPartnerNotices(user.uid, filterStatus)
      setNotices(data)
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
      alert('공지사항을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      try {
        await deleteNotice(id)
        alert('공지사항이 삭제되었습니다.')
        fetchNotices()
      } catch (error) {
        console.error('공지사항 삭제 실패:', error)
        alert('공지사항 삭제에 실패했습니다.')
      }
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>공지사항 관리</h1>
        <button
          className={styles.addButton}
          onClick={() => router.push('/partner/notice/write')}
        >
          새 공지사항 작성
        </button>
      </div>

      <div className={styles.filterSection}>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">전체</option>
          <option value="draft">임시저장</option>
          <option value="published">게시됨</option>
          <option value="archived">보관됨</option>
        </select>
      </div>

      {notices.length === 0 ? (
        <div className={styles.emptyState}>
          등록된 공지사항이 없습니다.
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>제목</th>
                <th>상태</th>
                <th>조회수</th>
                <th>게시일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((notice) => (
                <tr key={notice.id}>
                  <td>
                    <div className={styles.titleCell}>
                      <div className={styles.noticeTitle}>{notice.title}</div>
                    </div>
                  </td>
                  <td>{getStatusBadge(notice.status)}</td>
                  <td>{notice.viewCount || 0}</td>
                  <td>{formatDate(notice.publishedAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.editButton}
                        onClick={() => router.push(`/partner/notice/edit/${notice.id}`)}
                      >
                        수정
                      </button>
                      <button
                        className={styles.viewButton}
                        onClick={() => router.push(`/partner/notice/view/${notice.id}`)}
                      >
                        보기
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(notice.id!)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
