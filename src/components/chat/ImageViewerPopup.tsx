'use client'

import { useEffect } from 'react'
import styles from './ImageViewerPopup.module.css'

interface ImageViewerPopupProps {
  imageUrl: string
  onClose: () => void
}

export default function ImageViewerPopup({ imageUrl, onClose }: ImageViewerPopupProps) {
  useEffect(() => {
    // ESC 키로 닫기
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        <img src={imageUrl} alt="확대 이미지" className={styles.image} />
      </div>
    </div>
  )
}
