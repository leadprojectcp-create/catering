'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getNotice, updateNotice } from '@/lib/services/noticeService'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import styles from './NoticeWritePage.module.css'

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
    status: 'draft' as 'draft' | 'published' | 'archived'
  })

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
          status: notice.status
        })
      }
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
      alert('공지사항을 불러오는데 실패했습니다.')
      router.push('/partner/notice/management')
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
        status
      })

      alert('공지사항이 수정되었습니다.')
      router.push('/partner/notice/management')
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
        <button
          className={styles.cancelButton}
          onClick={() => router.push('/partner/notice/management')}
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
            placeholder="공지사항 제목을 입력하세요"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>내용 *</label>
          <textarea
            className={styles.textarea}
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="공지사항 내용을 입력하세요"
            rows={15}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.saveDraftButton}
            onClick={() => handleSubmit('draft')}
            disabled={saving}
          >
            임시 저장
          </button>
          <button
            className={styles.publishButton}
            onClick={() => handleSubmit('published')}
            disabled={saving}
          >
            게시하기
          </button>
          <button
            className={styles.archiveButton}
            onClick={() => handleSubmit('archived')}
            disabled={saving}
          >
            보관하기
          </button>
        </div>
      </div>
    </div>
  )
}
