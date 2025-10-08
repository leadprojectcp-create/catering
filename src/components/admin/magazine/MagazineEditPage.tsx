'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMagazine, updateMagazine } from '@/lib/services/magazineService'
import { useAuth } from '@/contexts/AuthContext'
import CustomEditor from '@/components/common/CustomEditor'
import Loading from '@/components/Loading'
import styles from './MagazineWritePage.module.css'

interface MagazineEditPageProps {
  magazineId: string
}

export default function MagazineEditPage({ magazineId }: MagazineEditPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    coverImage: null as File | null,
    existingCoverImage: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  })

  useEffect(() => {
    loadMagazine()
  }, [magazineId])

  const loadMagazine = async () => {
    try {
      const magazine = await getMagazine(magazineId)
      if (magazine) {
        setFormData({
          title: magazine.title,
          content: magazine.content,
          tags: magazine.tags?.join(', ') || '',
          coverImage: null,
          existingCoverImage: magazine.coverImage || '',
          status: magazine.status
        })
      }
    } catch (error) {
      console.error('매거진 로드 실패:', error)
      alert('매거진을 불러오는데 실패했습니다.')
      router.push('/admin/magazine')
    } finally {
      setLoading(false)
    }
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, coverImage: e.target.files![0] }))
    }
  }


  const uploadImage = async (file: File, type: string): Promise<string> => {
    const formDataToUpload = new FormData()
    formDataToUpload.append('file', file)
    formDataToUpload.append('type', 'magazine')
    formDataToUpload.append('subType', type)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formDataToUpload
    })

    if (!response.ok) {
      throw new Error('이미지 업로드 실패')
    }

    const result = await response.json()
    return result.url
  }

  const handleSubmit = async (status: 'draft' | 'published' | 'archived') => {
    if (!formData.title || !formData.content) {
      alert('제목, 내용은 필수 입력 항목입니다.')
      return
    }

    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setSaving(true)

    try {
      // 커버 이미지 처리
      let coverImageUrl = formData.existingCoverImage
      if (formData.coverImage) {
        coverImageUrl = await uploadImage(formData.coverImage, 'cover')
      }


      // 태그 처리
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      // 매거진 업데이트
      await updateMagazine(magazineId, {
        title: formData.title,
        content: formData.content,
        category: '',
        tags,
        coverImage: coverImageUrl,
        status
      })

      alert('매거진이 수정되었습니다.')
      router.push('/admin/magazine')
    } catch (error) {
      console.error('매거진 수정 실패:', error)
      alert('매거진 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>매거진 수정</h1>
        <button
          className={styles.cancelButton}
          onClick={() => router.push('/admin/magazine')}
        >
          취소
        </button>
      </div>

      <div className={styles.formContainer}>
        <div className={styles.formGroup}>
          <label className={styles.label}>제목 *</label>
          <input
            type="text"
            className={styles.input}
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="매거진 제목을 입력하세요"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>태그</label>
          <input
            type="text"
            className={styles.input}
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="태그를 쉼표로 구분하여 입력 (예: 디저트, 케이크, 생일)"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>커버 이미지</label>
          <div className={styles.coverImageContainer}>
            {!formData.coverImage && !formData.existingCoverImage ? (
              <label className={styles.coverImageUpload}>
                <input
                  type="file"
                  className={styles.hiddenInput}
                  accept="image/*"
                  onChange={handleCoverImageChange}
                />
                <div className={styles.uploadPlaceholder}>
                  <span className={styles.uploadIcon}>📷</span>
                  <span className={styles.uploadText}>커버 이미지 업로드</span>
                  <span className={styles.uploadHint}>클릭하여 이미지를 선택하세요</span>
                </div>
              </label>
            ) : formData.coverImage ? (
              <div className={styles.coverImagePreview}>
                <img
                  src={URL.createObjectURL(formData.coverImage)}
                  alt="새 커버 이미지 미리보기"
                />
                <button
                  type="button"
                  className={styles.removeImageButton}
                  onClick={() => setFormData(prev => ({ ...prev, coverImage: null }))}
                >
                  ✕ 새 이미지 제거
                </button>
              </div>
            ) : (
              <div className={styles.coverImagePreview}>
                <img
                  src={formData.existingCoverImage}
                  alt="기존 커버 이미지"
                />
                <button
                  type="button"
                  className={styles.removeImageButton}
                  onClick={() => setFormData(prev => ({ ...prev, existingCoverImage: '' }))}
                >
                  ✕ 기존 이미지 제거
                </button>
                <label className={styles.changeImageButton}>
                  <input
                    type="file"
                    className={styles.hiddenInput}
                    accept="image/*"
                    onChange={handleCoverImageChange}
                  />
                  이미지 변경
                </label>
              </div>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>내용 *</label>
          <div className={styles.editorWrapper}>
            <CustomEditor
              value={formData.content}
              onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
              placeholder="매거진 내용을 입력하세요"
            />
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.saveDraftButton}
            onClick={() => handleSubmit('draft')}
            disabled={saving}
          >
            임시 저장
          </button>
          {formData.status === 'published' && (
            <button
              className={styles.saveDraftButton}
              onClick={() => handleSubmit('archived')}
              disabled={saving}
            >
              보관하기
            </button>
          )}
          <button
            className={styles.publishButton}
            onClick={() => handleSubmit('published')}
            disabled={saving}
          >
            게시하기
          </button>
        </div>
      </div>
    </div>
  )
}