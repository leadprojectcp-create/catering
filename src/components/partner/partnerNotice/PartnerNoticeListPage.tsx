'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPartnerNotices, deleteNotice, updateNotice } from '@/lib/services/partnerNoticeService'
import { useAuth } from '@/contexts/AuthContext'
import type { Notice } from '@/lib/services/partnerNoticeService'
import Loading from '@/components/Loading'
import styles from './PartnerNoticeListPage.module.css'

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
      // isVisible이 true인 것을 맨 위로 정렬
      const sortedData = data.sort((a, b) => {
        if (a.isVisible && !b.isVisible) return -1
        if (!a.isVisible && b.isVisible) return 1
        return 0
      })
      setNotices(sortedData)
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

  const handleHide = async (id: string) => {
    if (confirm('공지사항을 내리시겠습니까?')) {
      try {
        await updateNotice(id, { isVisible: false })
        alert('공지사항이 내려졌습니다.')
        fetchNotices()
      } catch (error) {
        console.error('공지사항 숨김 실패:', error)
        alert('공지사항 숨김에 실패했습니다.')
      }
    }
  }

  const handleShow = async (id: string) => {
    if (confirm('이 공지사항을 공지하시겠습니까? 기존에 노출된 공지사항은 자동으로 내려갑니다.')) {
      try {
        await updateNotice(id, { isVisible: true })
        alert('공지사항이 공지되었습니다.')
        fetchNotices()
      } catch (error) {
        console.error('공지사항 노출 실패:', error)
        alert('공지사항 노출에 실패했습니다.')
      }
    }
  }

  const formatDate = (date: unknown) => {
    if (!date) return '-'
    const d = (date as { toDate?: () => Date })?.toDate ? (date as { toDate: () => Date }) : new Date(date as string | number | Date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
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
          onClick={() => router.push('/partner/partnerNotice/write')}
        >
          공지사항 작성하기
        </button>
      </div>

      {notices.length === 0 ? (
        <div className={styles.emptyState}>
          등록된 공지사항이 없습니다.
        </div>
      ) : (
        <div className={styles.noticeList}>
          {notices.map((notice) => (
            <div key={notice.id} className={styles.noticeCard}>
              {notice.isVisible && (
                <div className={styles.noticeHeader}>
                  <span className={styles.currentBadge}>현재 공지사항</span>
                </div>
              )}
              <div className={styles.noticeDate}>
                작성일 {formatDate(notice.createdAt)} 작성
              </div>
              <div className={styles.noticeTitle}>{notice.title}</div>
              <div className={styles.noticeContent} dangerouslySetInnerHTML={{ __html: notice.content }} />
              <div className={styles.noticeActions}>
                {notice.isVisible ? (
                  <button
                    className={styles.hideButton}
                    onClick={() => handleHide(notice.id!)}
                  >
                    내리기
                  </button>
                ) : (
                  <button
                    className={styles.showButton}
                    onClick={() => handleShow(notice.id!)}
                  >
                    공지하기
                  </button>
                )}
                <div className={styles.rightActions}>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(notice.id!)}
                  >
                    삭제
                  </button>
                  <button
                    className={styles.editButton}
                    onClick={() => router.push(`/partner/partnerNotice/edit/${notice.id}`)}
                  >
                    수정
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
