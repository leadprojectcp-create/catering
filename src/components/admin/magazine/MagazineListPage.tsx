'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMagazines, deleteMagazine } from '@/lib/services/magazineService'
import type { Magazine } from '@/lib/services/magazineService'
import Loading from '@/components/Loading'
import styles from './MagazineListPage.module.css'

export default function MagazineListPage() {
  const router = useRouter()
  const [magazines, setMagazines] = useState<Magazine[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchMagazines()
  }, [filterStatus])

  const fetchMagazines = async () => {
    try {
      setLoading(true)
      const data = await getMagazines(filterStatus)
      setMagazines(data)
    } catch (error) {
      console.error('매거진 로드 실패:', error)
      alert('매거진을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('정말로 이 매거진을 삭제하시겠습니까?')) {
      try {
        await deleteMagazine(id)
        alert('매거진이 삭제되었습니다.')
        fetchMagazines()
      } catch (error) {
        console.error('매거진 삭제 실패:', error)
        alert('매거진 삭제에 실패했습니다.')
      }
    }
  }

  const formatDate = (date: unknown) => {
    if (!date) return '-'
    const d = new Date(date as string)
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
        <h1 className={styles.title}>매거진 관리</h1>
        <button
          className={styles.addButton}
          onClick={() => router.push('/admin/magazine/write')}
        >
          새 매거진 작성
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

      {magazines.length === 0 ? (
        <div className={styles.emptyState}>
          등록된 매거진이 없습니다.
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>제목</th>
                <th>작성자</th>
                <th>상태</th>
                <th>조회수</th>
                <th>좋아요</th>
                <th>게시일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {magazines.map((magazine) => (
                <tr key={magazine.id}>
                  <td>
                    <div className={styles.titleCell}>
                      <div className={styles.magazineTitle}>{magazine.title}</div>
                    </div>
                  </td>
                  <td>{magazine.author}</td>
                  <td>{getStatusBadge(magazine.status)}</td>
                  <td>{magazine.viewCount || 0}</td>
                  <td>{magazine.likeCount || 0}</td>
                  <td>{formatDate(magazine.publishedAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.editButton}
                        onClick={() => router.push(`/admin/magazine/edit/${magazine.id}`)}
                      >
                        수정
                      </button>
                      <button
                        className={styles.viewButton}
                        onClick={() => router.push(`/admin/magazine/view/${magazine.id}`)}
                      >
                        보기
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(magazine.id!)}
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