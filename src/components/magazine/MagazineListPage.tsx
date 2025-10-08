'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getPublishedMagazines } from '@/lib/services/magazineService'
import type { Magazine } from '@/lib/services/magazineService'
import { createMagazineSlug } from '@/lib/utils/slug'
import Loading from '@/components/Loading'
import styles from './MagazineListPage.module.css'

export default function MagazineListPage() {
  const router = useRouter()
  const [magazines, setMagazines] = useState<Magazine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMagazines()
  }, [])

  const fetchMagazines = async () => {
    try {
      setLoading(true)
      const data = await getPublishedMagazines()
      setMagazines(data)
    } catch (error) {
      console.error('매거진 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: unknown) => {
    if (!date) return ''
    const d = (date as { toDate?: () => Date })?.toDate ? (date as { toDate: () => Date }).toDate() : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ''
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>픽투잇 매거진</h1>
        <p className={styles.subtitle}>믿고 맡길 수 있는 단체 주문, 입점 업체들의 배송 노하우</p>
      </div>

      {magazines.length === 0 ? (
        <div className={styles.emptyState}>
          <p>아직 게시된 매거진이 없습니다.</p>
        </div>
      ) : (
        <div className={styles.magazineGrid}>
          {magazines.map((magazine) => (
            <article
              key={magazine.id}
              className={styles.magazineCard}
              onClick={() => router.push(`/magazine/${createMagazineSlug(magazine.id, magazine.title)}`)}
            >
              {magazine.coverImage && (
                <div className={styles.coverImage}>
                  <Image
                    src={magazine.coverImage}
                    alt={magazine.title}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
              <div className={styles.cardContent}>
                <div className={styles.cardBody}>
                  <h2 className={styles.cardTitle}>{magazine.title}</h2>
                  <p className={styles.cardDescription}>
                    {stripHtml(magazine.content)}
                  </p>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.date}>{formatDate(magazine.publishedAt)}</span>
                  <div className={styles.stats}>
                    <span className={styles.stat}>
                      <Image src="/icons/view.svg" alt="조회수" width={16} height={16} />
                      {magazine.viewCount || 0}
                    </span>
                    <span className={styles.stat}>
                      <Image src="/icons/heart.svg" alt="좋아요" width={16} height={16} />
                      {magazine.likeCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}