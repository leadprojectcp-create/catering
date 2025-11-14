'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMagazine } from '@/lib/services/magazineService'
import type { Magazine } from '@/lib/services/magazineService'
import Loading from '@/components/Loading'
import styles from './MagazineViewPage.module.css'

interface MagazineViewPageProps {
  magazineId: string
}

export default function MagazineViewPage({ magazineId }: MagazineViewPageProps) {
  const router = useRouter()
  const [magazine, setMagazine] = useState<Magazine | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMagazine()
  }, [magazineId])

  const loadMagazine = async () => {
    try {
      const data = await getMagazine(magazineId)
      setMagazine(data)
    } catch (error) {
      console.error('매거진 로드 실패:', error)
      alert('매거진을 불러오는데 실패했습니다.')
      router.push('/admin/magazine')
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
  if (!magazine) return <div>매거진을 찾을 수 없습니다.</div>

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.backButton} onClick={() => router.push('/admin/magazine')}>
          ← 목록으로
        </div>
        <div className={styles.actions}>
          <button
            className={styles.editButton}
            onClick={() => router.push(`/admin/magazine/edit/${magazineId}`)}
          >
            수정
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {magazine.coverImage && (
          <div className={styles.coverImage}>
            <img src={magazine.coverImage} alt={magazine.title} />
          </div>
        )}

        <div className={styles.meta}>
          <div className={styles.category}>{magazine.category}</div>
          {getStatusBadge(magazine.status)}
        </div>

        <h1 className={styles.title}>{magazine.title}</h1>

        <div className={styles.info}>
          <span>작성자: {magazine.author}</span>
          <span>•</span>
          <span>{formatDate(magazine.publishedAt || magazine.createdAt)}</span>
          <span>•</span>
          <span>조회 {magazine.viewCount || 0}</span>
          <span>•</span>
          <span>좋아요 {magazine.likeCount || 0}</span>
        </div>

        {magazine.tags && magazine.tags.length > 0 && (
          <div className={styles.tags}>
            {magazine.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className={styles.divider} />

        <div
          className={styles.articleContent}
          dangerouslySetInnerHTML={{ __html: magazine.content }}
        />

        {magazine.images && magazine.images.length > 0 && (
          <div className={styles.imageGallery}>
            <h3 className={styles.galleryTitle}>이미지 갤러리</h3>
            <div className={styles.imageGrid}>
              {magazine.images.map((image, index) => (
                <div key={index} className={styles.galleryImage}>
                  <img src={image} alt={`이미지 ${index + 1}`} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}