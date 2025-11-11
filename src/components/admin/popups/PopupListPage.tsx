'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPopups, deletePopup, togglePopupStatus, type Popup } from '@/lib/services/popupService'
import Loading from '@/components/Loading'
import styles from './PopupListPage.module.css'

export default function PopupListPage() {
  const router = useRouter()
  const [popups, setPopups] = useState<Popup[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTargetType, setFilterTargetType] = useState('all')

  useEffect(() => {
    fetchPopups()
  }, [filterStatus, filterTargetType])

  const fetchPopups = async () => {
    try {
      setLoading(true)
      const data = await getPopups(filterStatus, filterTargetType)
      setPopups(data)
    } catch (error) {
      console.error('팝업 로드 실패:', error)
      alert('팝업을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('정말로 이 팝업을 삭제하시겠습니까?')) {
      try {
        await deletePopup(id)
        alert('팝업이 삭제되었습니다.')
        fetchPopups()
      } catch (error) {
        console.error('팝업 삭제 실패:', error)
        alert('팝업 삭제에 실패했습니다.')
      }
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      await togglePopupStatus(id, currentStatus)
      alert(`팝업이 ${currentStatus === 'active' ? '비활성화' : '활성화'}되었습니다.`)
      fetchPopups()
    } catch (error) {
      console.error('팝업 상태 변경 실패:', error)
      alert('팝업 상태 변경에 실패했습니다.')
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { label: '활성화', className: styles.badgeActive },
      inactive: { label: '비활성화', className: styles.badgeInactive }
    }
    const badge = badges[status as keyof typeof badges] || badges.inactive
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
        <h1 className={styles.title}>팝업 관리</h1>
        <button
          className={styles.addButton}
          onClick={() => router.push('/admin/popups/write')}
        >
          새 팝업 등록
        </button>
      </div>

      <div className={styles.filterSection}>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="active">활성화</option>
          <option value="inactive">비활성화</option>
        </select>

        <select
          className={styles.filterSelect}
          value={filterTargetType}
          onChange={(e) => setFilterTargetType(e.target.value)}
        >
          <option value="all">전체 대상</option>
          <option value="all">전체 유저</option>
          <option value="partner">파트너</option>
          <option value="user">일반 유저</option>
        </select>
      </div>

      {popups.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📋</div>
          <div className={styles.emptyStateText}>등록된 팝업이 없습니다.</div>
          <button
            className={styles.addButton}
            onClick={() => router.push('/admin/popups/write')}
          >
            첫 팝업 등록하기
          </button>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>순서</th>
              <th>미리보기</th>
              <th>제목</th>
              <th>링크 URL</th>
              <th>대상</th>
              <th>게시 기간</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {popups.map((popup) => (
              <tr key={popup.id}>
                <td>
                  <span className={styles.displayOrder}>{popup.displayOrder}</span>
                </td>
                <td className={styles.thumbnailCell}>
                  {popup.imageUrl && (
                    <img
                      src={popup.imageUrl}
                      alt={popup.title}
                      className={styles.thumbnail}
                    />
                  )}
                </td>
                <td className={styles.titleCell}>{popup.title}</td>
                <td>
                  {popup.linkUrl ? (
                    <a
                      href={popup.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkUrl}
                    >
                      {popup.linkUrl}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{getTargetTypeBadge(popup.targetType)}</td>
                <td className={styles.dateRange}>
                  {formatDate(popup.startDate)} ~ {formatDate(popup.endDate)}
                </td>
                <td>{getStatusBadge(popup.status)}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.actionButton} ${styles.toggleButton}`}
                      onClick={() => handleToggleStatus(popup.id, popup.status)}
                    >
                      {popup.status === 'active' ? '비활성화' : '활성화'}
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.editButton}`}
                      onClick={() => router.push(`/admin/popups/edit/${popup.id}`)}
                    >
                      수정
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDelete(popup.id)}
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
