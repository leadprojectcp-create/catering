'use client'

import { useState, useRef } from 'react'
import styles from './ChatMessageAttachment.module.css'

interface ChatMessageAttachmentProps {
  onImageSelect: (file: File) => void
  onProductSelect: () => void
  onClose: () => void
}

export default function ChatMessageAttachment({
  onImageSelect,
  onProductSelect,
  onClose
}: ChatMessageAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 이미지 파일인지 확인
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.')
        return
      }
      onImageSelect(file)
      onClose()
    }
  }

  const handleProductClick = () => {
    onProductSelect()
    onClose()
  }

  return (
    <>
      {/* 오버레이 */}
      <div className={styles.overlay} onClick={onClose} />

      {/* 팝업 */}
      <div className={styles.popup}>
        <button className={styles.option} onClick={handleImageClick}>
          <div className={styles.iconWrapper}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <span>사진</span>
        </button>

        <button className={styles.option} onClick={handleProductClick}>
          <div className={styles.iconWrapper}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <span>상품</span>
        </button>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </>
  )
}
