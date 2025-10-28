import React from 'react'
import styles from './ImageUploadSection.module.css'

interface ImageUploadSectionProps {
  images: File[]
  onChange: (images: File[]) => void
}

export default function ImageUploadSection({ images, onChange }: ImageUploadSectionProps) {
  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    onChange([...images, ...files])
  }

  const handleImageRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>1</span>
        <span className={styles.sectionTitle}>상품 이미지 등록</span>
      </div>
      <div className={styles.imageUploadSection}>
        <div className={styles.imageGrid}>
          {/* 이미지 미리보기 */}
          {images.map((file, index) => (
            <div key={index} className={`${styles.imagePreviewBox} ${index === 0 ? styles.mainImage : ''}`}>
              <img
                src={URL.createObjectURL(file)}
                alt={`상품 이미지 ${index + 1}`}
                className={styles.previewImage}
              />
              {index === 0 && (
                <div className={styles.mainImageLabel}>대표</div>
              )}
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={() => handleImageRemove(index)}
              >
                ✕
              </button>
            </div>
          ))}

          {/* 이미지 추가 버튼 */}
          <label className={styles.addImageButton}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageAdd}
              className={styles.fileInput}
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12H12M12 12H19M12 12V5M12 12V19" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </label>
        </div>
      </div>
    </div>
  )
}
