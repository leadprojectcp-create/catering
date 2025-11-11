'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBanner, updateBanner } from '@/lib/services/bannerService'
import Loading from '@/components/Loading'
import styles from './BannerWritePage.module.css'

interface BannerEditPageProps {
  bannerId: string
}

export default function BannerEditPage({ bannerId }: BannerEditPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // 폼 필드
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('inactive')
  const [displayOrder, setDisplayOrder] = useState(0)

  useEffect(() => {
    fetchBanner()
  }, [bannerId])

  const fetchBanner = async () => {
    try {
      setLoading(true)
      const banner = await getBanner(bannerId)

      if (!banner) {
        alert('배너를 찾을 수 없습니다.')
        router.push('/admin/banners')
        return
      }

      setTitle(banner.title)
      setImageUrl(banner.imageUrl || '')
      setImagePreview(banner.imageUrl || '')
      setLinkUrl(banner.linkUrl || '')
      setStatus(banner.status)
      setDisplayOrder(banner.displayOrder)
    } catch (error) {
      console.error('배너 로드 실패:', error)
      alert('배너를 불러오는데 실패했습니다.')
      router.push('/admin/banners')
    } finally {
      setLoading(false)
    }
  }

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
    if (imagePreview && imagePreview.startsWith('blob:')) {
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
      alert('배너 이미지를 업로드해주세요.')
      return
    }

    setUploading(true)

    try {
      let finalImageUrl = imageUrl

      // 이미지 업로드
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        formData.append('type', 'banner')

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

      // 배너 수정
      await updateBanner(bannerId, {
        title: title.trim(),
        description: '',
        backgroundColor: '#000000',
        imageUrl: finalImageUrl,
        linkUrl: linkUrl.trim(),
        status,
        displayOrder
      })

      alert('배너가 수정되었습니다.')
      router.push('/admin/banners')
    } catch (error) {
      console.error('배너 수정 실패:', error)
      alert('배너 수정에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>배너 수정</h1>
        <p className={styles.subtitle}>배너 정보를 수정합니다.</p>
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
            placeholder="배너 제목을 입력하세요 (관리용)"
            maxLength={100}
          />
        </div>

        {/* 배너 이미지 */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            배너 이미지<span className={styles.required}>*</span>
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
                <div className={styles.uploadSubtext}>권장 크기: 290 x 340px, 최대 10MB</div>
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
          <div className={styles.helpText}>배너 클릭 시 이동할 URL을 입력하세요.</div>
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
            {uploading ? '수정 중...' : '배너 수정'}
          </button>
        </div>
      </form>
    </div>
  )
}
