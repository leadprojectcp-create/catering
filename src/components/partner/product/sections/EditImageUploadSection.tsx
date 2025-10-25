import React from 'react'
import styles from '../AddProductPage.module.css'

interface EditImageUploadSectionProps {
  existingImages: string[]
  newImages: File[]
  onExistingImageRemove: (index: number) => void
  onNewImagesAdd: (files: File[]) => void
  onNewImageRemove: (index: number) => void
}

export default function EditImageUploadSection({
  existingImages,
  newImages,
  onExistingImageRemove,
  onNewImagesAdd,
  onNewImageRemove
}: EditImageUploadSectionProps) {
  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    onNewImagesAdd(files)
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>1</span>
        <span className={styles.sectionTitle}>상품 이미지 등록</span>
      </div>
      <div className={styles.imageUploadSection}>
        <div className={styles.imageGrid}>
          {/* 기존 이미지 미리보기 */}
          {existingImages.map((url, index) => (
            <div key={`existing-${index}`} className={`${styles.imagePreviewBox} ${index === 0 ? styles.mainImage : ''}`}>
              <img
                src={url}
                alt={`상품 이미지 ${index + 1}`}
                className={styles.previewImage}
              />
              {index === 0 && (
                <div className={styles.mainImageLabel}>대표</div>
              )}
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={() => onExistingImageRemove(index)}
              >
                ✕
              </button>
            </div>
          ))}

          {/* 새로 추가한 이미지 미리보기 */}
          {newImages.map((file, index) => (
            <div key={`new-${index}`} className={styles.imagePreviewBox}>
              <img
                src={URL.createObjectURL(file)}
                alt={`새 이미지 ${index + 1}`}
                className={styles.previewImage}
              />
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={() => onNewImageRemove(index)}
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
