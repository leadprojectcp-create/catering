'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPopup } from '@/lib/services/popupService'
import styles from './PopupWritePage.module.css'

export default function PopupWritePage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  // 폼 필드
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [targetType, setTargetType] = useState<'all' | 'partner' | 'user'>('all')
  const [status, setStatus] = useState<'active' | 'inactive'>('inactive')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview('')
    setImageUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 필수 항목 검증
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    if (!imageFile && !imageUrl) {
      alert('팝업 이미지를 업로드해주세요.')
      return
    }

    if (!startDate || !endDate) {
      alert('게시 기간을 설정해주세요.')
      return
    }

    // 날짜 검증
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start > end) {
      alert('종료일은 시작일보다 이후여야 합니다.')
      return
    }

    setUploading(true)

    try {
      let finalImageUrl = imageUrl

      // 이미지 업로드
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        formData.append('type', 'popup')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '이미지 업로드 실패')
        }

        const data = await response.json()
        finalImageUrl = data.url
      }

      // 팝업 생성
      await createPopup({
        title: title.trim(),
        imageUrl: finalImageUrl,
        linkUrl: linkUrl.trim(),
        targetType,
        status,
        displayOrder,
        startDate: startDate,
        endDate: endDate
      })

      alert('팝업이 등록되었습니다.')
      router.push('/admin/popups')
    } catch (error) {
      console.error('팝업 등록 실패:', error)
      alert('팝업 등록에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>새 팝업 등록</h1>
        <p className={styles.subtitle}>앱에 표시될 팝업을 등록합니다.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* 제목 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            제목<span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="팝업 제목을 입력하세요"
            maxLength={100}
          />
        </div>

        {/* 팝업 이미지 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            팝업 이미지<span className={styles.required}>*</span>
          </label>
          <div
            className={`${styles.imageUploadSection} ${imagePreview ? styles.hasImage : ''}`}
            onClick={() => !imagePreview && document.getElementById('imageInput')?.click()}
          >
            {imagePreview ? (
              <div className={styles.imagePreviewWrapper}>
                <img src={imagePreview} alt="미리보기" className={styles.imagePreview} />
                <button
                  type="button"
                  className={styles.removeImageButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveImage()
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div className={styles.uploadIcon}>🖼️</div>
                <div className={styles.uploadText}>클릭하여 이미지 업로드</div>
                <div className={styles.uploadSubtext}>권장 크기: 1080 x 1920px (9:16), 최대 10MB</div>
              </>
            )}
          </div>
          <input
            type="file"
            id="imageInput"
            className={styles.hiddenInput}
            accept="image/*"
            onChange={handleImageSelect}
          />
        </div>

        {/* 링크 URL */}
        <div className={styles.formGroup}>
          <label className={styles.label}>링크 URL (선택)</label>
          <input
            type="url"
            className={styles.input}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
          />
          <div className={styles.helpText}>팝업 클릭 시 이동할 URL을 입력하세요.</div>
        </div>

        {/* 대상 유저 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            대상 유저<span className={styles.required}>*</span>
          </label>
          <select
            className={styles.select}
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as 'all' | 'partner' | 'user')}
          >
            <option value="all">전체 유저</option>
            <option value="partner">파트너</option>
            <option value="user">일반 유저</option>
          </select>
        </div>

        {/* 표시 순서 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            표시 순서<span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            className={styles.input}
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            min="0"
            placeholder="0"
          />
          <div className={styles.helpText}>숫자가 낮을수록 먼저 표시됩니다.</div>
        </div>

        {/* 게시 기간 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            게시 기간<span className={styles.required}>*</span>
          </label>
          <div className={styles.dateRow}>
            <div>
              <input
                type="date"
                className={styles.input}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <input
                type="date"
                className={styles.input}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.helpText}>팝업이 표시될 기간을 설정하세요.</div>
        </div>

        {/* 상태 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            상태<span className={styles.required}>*</span>
          </label>
          <select
            className={styles.select}
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
          >
            <option value="inactive">비활성화</option>
            <option value="active">활성화</option>
          </select>
          <div className={styles.helpText}>활성화하면 즉시 사용자에게 표시됩니다.</div>
        </div>

        {/* 버튼 */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.back()}
            disabled={uploading}
          >
            취소
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={uploading}
          >
            {uploading ? '등록 중...' : '팝업 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
