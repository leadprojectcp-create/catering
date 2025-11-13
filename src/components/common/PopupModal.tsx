'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getActivePopups, type Popup } from '@/lib/services/popupService'
import styles from './PopupModal.module.css'

interface PopupModalProps {
  targetType: 'all' | 'partner' | 'user'
}

// BunnyCDN 이미지 최적화 파라미터 추가
const optimizePopupImage = (url: string) => {
  if (!url.includes('danmo.b-cdn.net')) return url

  // 팝업 이미지는 큰 사이즈이므로 width=1200, quality=85
  const params = new URLSearchParams({
    width: '1200',
    quality: '85',
    format: 'webp'
  })

  return `${url}?${params.toString()}`
}

export default function PopupModal({ targetType }: PopupModalProps) {
  const [popups, setPopups] = useState<Popup[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    fetchPopups()
  }, [])

  const fetchPopups = async () => {
    try {
      const data = await getActivePopups(targetType)

      // 오늘 하루 보지 않기로 설정된 팝업 필터링
      const today = new Date().toDateString()
      const hiddenPopups = JSON.parse(localStorage.getItem('hiddenPopups') || '{}')

      const visiblePopups = data.filter(popup => {
        const hiddenDate = hiddenPopups[popup.id]
        if (!hiddenDate) return true
        return new Date(hiddenDate).toDateString() !== today
      })

      if (visiblePopups.length > 0) {
        setPopups(visiblePopups)
        setIsVisible(true)
      }
    } catch (error) {
      console.error('팝업 로드 실패:', error)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  const handleCloseToday = () => {
    if (popups[currentIndex]) {
      const hiddenPopups = JSON.parse(localStorage.getItem('hiddenPopups') || '{}')
      hiddenPopups[popups[currentIndex].id] = new Date().toISOString()
      localStorage.setItem('hiddenPopups', JSON.stringify(hiddenPopups))
    }

    // 다음 팝업이 있으면 표시, 없으면 닫기
    if (currentIndex < popups.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleClose()
    }
  }

  const handlePopupClick = () => {
    const popup = popups[currentIndex]
    if (popup.linkUrl) {
      window.open(popup.linkUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : popups.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < popups.length - 1 ? prev + 1 : 0))
  }

  if (!isVisible || popups.length === 0) return null

  const currentPopup = popups[currentIndex]

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose}>
          ✕
        </button>

        {popups.length > 1 && (
          <>
            <button className={`${styles.navigationButton} ${styles.prevButton}`} onClick={handlePrev}>
              ‹
            </button>
            <button className={`${styles.navigationButton} ${styles.nextButton}`} onClick={handleNext}>
              ›
            </button>
          </>
        )}

        <Image
          src={optimizePopupImage(currentPopup.imageUrl)}
          alt={currentPopup.title}
          className={styles.popupImage}
          onClick={handlePopupClick}
          style={{ cursor: currentPopup.linkUrl ? 'pointer' : 'default' }}
          width={1200}
          height={1600}
          quality={85}
          priority
          unoptimized={!currentPopup.imageUrl.includes('danmo.b-cdn.net')}
        />

        <div className={styles.controls}>
          <button className={styles.controlButton} onClick={handleCloseToday}>
            오늘 하루 보지 않기
          </button>
          <button className={styles.controlButton} onClick={handleClose}>
            닫기
          </button>
        </div>

        {popups.length > 1 && (
          <div className={styles.indicator}>
            {popups.map((_, index) => (
              <div
                key={index}
                className={`${styles.dot} ${index === currentIndex ? styles.active : ''}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
