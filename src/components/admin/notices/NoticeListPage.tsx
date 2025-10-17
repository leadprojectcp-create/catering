'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getNotices, deleteNotice } from '@/lib/services/noticeService'
import type { Notice } from '@/types/notice'
import Loading from '@/components/Loading'
import styles from './NoticeListPage.module.css'

export default function NoticeListPage() {
  const router = useRouter()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTargetType, setFilterTargetType] = useState('all')

  useEffect(() => {
    fetchNotices()
  }, [filterStatus, filterTargetType])

  const fetchNotices = async () => {
    try {
      setLoading(true)
      const data = await getNotices(filterStatus, filterTargetType)
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
      published: { label: '게시됨', className: styles.badgePublished }
    }
    const badge = badges[status as keyof typeof badges] || badges.draft
    return <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
  }

  const getTargetTypeBadge = (targetType: string) => {
    const badges = {
      all: { label: '전체', className: styles.targetAll },
      partner: { label: '파트너', className: styles.targetPartner },
      user: { label: '일반 유저', className: styles.targetUser }
    }
    const badge = badges[targetType as keyof typeof badges] || badges.all
    return <span className={`${styles.targetBadge} ${badge.className}`}>{badge.label}</span>
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>공지사항 관리</h1>
        <button
          className={styles.addButton}
          onClick={() => router.push('/admin/notices/write')}
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
          <option value="all">전체 상태</option>
          <option value="draft">임시저장</option>
          <option value="published">게시됨</option>
        </select>

        <select
          className={styles.filterSelect}
          value={filterTargetType}
          onChange={(e) => setFilterTargetType(e.target.value)}
        >
          <option value="all">전체 대상</option>
          <option value="partner">파트너</option>
          <option value="user">일반 유저</option>
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
                <th>대상</th>
                <th>작성자</th>
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
                  <td>{getTargetTypeBadge(notice.targetType)}</td>
                  <td>{notice.author}</td>
                  <td>{getStatusBadge(notice.status)}</td>
                  <td>{notice.viewCount || 0}</td>
                  <td>{formatDate(notice.publishedAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.editButton}
                        onClick={() => router.push(`/admin/notices/edit/${notice.id}`)}
                      >
                        수정
                      </button>
                      <button
                        className={styles.viewButton}
                        onClick={() => router.push(`/admin/notices/view/${notice.id}`)}
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
