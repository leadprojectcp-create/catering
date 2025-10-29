'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getNotice, updateNotice } from '@/lib/services/partnerNoticeService'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import styles from './PartnerNoticeWritePage.module.css'

interface NoticeEditPageProps {
  noticeId: string
}

export default function NoticeEditPage({ noticeId }: NoticeEditPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    isVisible: true
  })

  // HTML 태그 제거 함수
  const removeHtmlTags = (text: string) => {
    return text.replace(/<[^>]*>/g, '')
  }

  // 내용 변경 핸들러
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    // HTML 태그가 포함되어 있으면 제거
    const cleanValue = removeHtmlTags(newValue)
    setFormData(prev => ({ ...prev, content: cleanValue }))
  }

  useEffect(() => {
    loadNotice()
  }, [noticeId])

  const loadNotice = async () => {
    try {
      const notice = await getNotice(noticeId)
      if (notice) {
        setFormData({
          title: notice.title,
          content: notice.content,
          status: notice.status,
          isVisible: notice.isVisible ?? true
        })
      }
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
      alert('공지사항을 불러오는데 실패했습니다.')
      router.push('/partner/partnerNotice/management')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (status: 'draft' | 'published' | 'archived') => {
    if (!formData.title || !formData.content) {
      alert('제목과 내용은 필수 입력 항목입니다.')
      return
    }

    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setSaving(true)

    try {
      await updateNotice(noticeId, {
        title: formData.title,
        content: formData.content,
        status,
        isVisible: formData.isVisible
      })

      alert('공지사항이 수정되었습니다.')
      router.push('/partner/partnerNotice/management')
    } catch (error) {
      console.error('공지사항 수정 실패:', error)
      alert('공지사항 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>공지사항 수정</h1>
      </div>

      <div className={styles.formContainer}>
        <div className={styles.formGroup}>
          <label className={styles.label}>제목</label>
          <input
            type="text"
            className={styles.input}
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="공지사항 제목을 입력하세요"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>내용</label>
          <textarea
            className={styles.textarea}
            value={formData.content}
            onChange={handleContentChange}
            placeholder="공지사항 내용을 입력하세요 (HTML 코드는 자동으로 제거됩니다)"
            rows={15}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={formData.isVisible}
              onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
            />
            <span className={styles.checkboxText}>공지사항 노출</span>
          </label>
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.cancelButton}
            onClick={() => router.push('/partner/partnerNotice/management')}
            disabled={saving}
          >
            취소하기
          </button>
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
