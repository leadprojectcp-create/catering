'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getMagazine, incrementViewCount, toggleLike } from '@/lib/services/magazineService'
import type { Magazine } from '@/lib/services/magazineService'
import Loading from '@/components/Loading'
import styles from './MagazineDetailPage.module.css'

interface MagazineDetailPageProps {
  magazineId: string
}

export default function MagazineDetailPage({ magazineId }: MagazineDetailPageProps) {
  const router = useRouter()
  const [magazine, setMagazine] = useState<Magazine | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    loadMagazine()
    // 조회수 증가
    incrementViewCount(magazineId)
  }, [magazineId])

  const loadMagazine = async () => {
    try {
      const data = await getMagazine(magazineId)
      if (data && data.status === 'published') {
        setMagazine(data)
        setLikeCount(data.likeCount || 0)
        // localStorage에서 좋아요 상태 확인
        const likedMagazines = JSON.parse(localStorage.getItem('likedMagazines') || '[]')
        setIsLiked(likedMagazines.includes(magazineId))
      } else {
        alert('매거진을 찾을 수 없습니다.')
        router.push('/magazine')
      }
    } catch (error) {
      console.error('매거진 로드 실패:', error)
      alert('매거진을 불러오는데 실패했습니다.')
      router.push('/magazine')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    try {
      const likedMagazines = JSON.parse(localStorage.getItem('likedMagazines') || '[]')

      if (isLiked) {
        // 좋아요 취소
        await toggleLike(magazineId, false)
        setLikeCount(prev => Math.max(0, prev - 1))
        const filtered = likedMagazines.filter((id: string) => id !== magazineId)
        localStorage.setItem('likedMagazines', JSON.stringify(filtered))
      } else {
        // 좋아요
        await toggleLike(magazineId, true)
        setLikeCount(prev => prev + 1)
        likedMagazines.push(magazineId)
        localStorage.setItem('likedMagazines', JSON.stringify(likedMagazines))
      }

      setIsLiked(!isLiked)
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
    }
  }

  const formatDate = (date: unknown) => {
    if (!date) return ''
    const d = (date as { toDate?: () => Date })?.toDate ? (date as { toDate: () => Date }) : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return <Loading />
  }

  if (!magazine) {
    return <div>매거진을 찾을 수 없습니다.</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/magazine')}
        >
          ← 목록으로
        </button>
      </div>

      <article className={styles.article}>
        {magazine.coverImage && (
          <div className={styles.coverImage}>
            <Image
              src={magazine.coverImage}
              alt={magazine.title}
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>
        )}

        <div className={styles.articleHeader}>
          <div className={styles.category}>{magazine.category}</div>
          <h1 className={styles.title}>{magazine.title}</h1>
          <div className={styles.meta}>
            <div className={styles.authorInfo}>
              <span className={styles.author}>by {magazine.author}</span>
              <span className={styles.date}>{formatDate(magazine.publishedAt)}</span>
            </div>
            <div className={styles.stats}>
              <span>조회 {magazine.viewCount || 0}</span>
            </div>
          </div>
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
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: magazine.content }}
        />

        <div className={styles.likeSection}>
          <button
            className={`${styles.likeButton} ${isLiked ? styles.liked : ''}`}
            onClick={handleLike}
          >
            <span className={styles.likeIcon}>
              <Image
                src={isLiked ? "/icons/heart-filled.svg" : "/icons/heart.svg"}
                alt={isLiked ? "좋아요 취소" : "좋아요"}
                width={20}
                height={20}
              />
            </span>
            <span className={styles.likeText}>
              {isLiked ? '좋아요 취소' : '좋아요'} ({likeCount})
            </span>
          </button>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.listButton}
            onClick={() => router.push('/magazine')}
          >
            매거진 목록 보기
          </button>
        </div>
      </article>
    </div>
  )
}