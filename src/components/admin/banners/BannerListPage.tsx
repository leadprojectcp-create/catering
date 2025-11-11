'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBanners, deleteBanner, toggleBannerStatus, type Banner } from '@/lib/services/bannerService'
import Loading from '@/components/Loading'
import styles from './BannerListPage.module.css'

export default function BannerListPage() {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchBanners()
  }, [filterStatus])

  const fetchBanners = async () => {
    try {
      setLoading(true)
      const data = await getBanners(filterStatus)
      setBanners(data)
    } catch (error) {
      console.error('배너 로드 실패:', error)
      alert('배너를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('정말로 이 배너를 삭제하시겠습니까?')) {
      try {
        await deleteBanner(id)
        alert('배너가 삭제되었습니다.')
        fetchBanners()
      } catch (error) {
        console.error('배너 삭제 실패:', error)
        alert('배너 삭제에 실패했습니다.')
      }
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      await toggleBannerStatus(id, currentStatus)
      alert(`배너가 ${currentStatus === 'active' ? '비활성화' : '활성화'}되었습니다.`)
      fetchBanners()
    } catch (error) {
      console.error('배너 상태 변경 실패:', error)
      alert('배너 상태 변경에 실패했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { label: '활성화', className: styles.badgeActive },
      inactive: { label: '비활성화', className: styles.badgeInactive }
    }
    const badge = badges[status as keyof typeof badges] || badges.inactive
    return <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>배너 관리</h1>
        <button
          className={styles.addButton}
          onClick={() => router.push('/admin/banners/write')}
        >
          새 배너 등록
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
      </div>

      {banners.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>🎨</div>
          <div className={styles.emptyStateText}>등록된 배너가 없습니다.</div>
          <button
            className={styles.addButton}
            onClick={() => router.push('/admin/banners/write')}
          >
            첫 배너 등록하기
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
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {banners.map((banner) => (
              <tr key={banner.id}>
                <td>
                  <span className={styles.displayOrder}>{banner.displayOrder}</span>
                </td>
                <td className={styles.thumbnailCell}>
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className={styles.thumbnail}
                    />
                  ) : (
                    <div className={styles.noImage}>이미지 없음</div>
                  )}
                </td>
                <td className={styles.titleCell}>{banner.title}</td>
                <td>
                  {banner.linkUrl ? (
                    <a
                      href={banner.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkUrl}
                    >
                      {banner.linkUrl}
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{getStatusBadge(banner.status)}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.actionButton} ${styles.toggleButton}`}
                      onClick={() => handleToggleStatus(banner.id, banner.status)}
                    >
                      {banner.status === 'active' ? '비활성화' : '활성화'}
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.editButton}`}
                      onClick={() => router.push(`/admin/banners/edit/${banner.id}`)}
                    >
                      수정
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDelete(banner.id)}
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
