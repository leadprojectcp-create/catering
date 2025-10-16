'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createNotice } from '@/lib/services/noticeService'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import styles from './NoticeWritePage.module.css'

export default function NoticeWritePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'draft' as 'draft' | 'published',
    isVisible: true
  })

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!formData.title || !formData.content) {
      alert('제목과 내용은 필수 입력 항목입니다.')
      return
    }

    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    setLoading(true)

    try {
      await createNotice({
        title: formData.title,
        content: formData.content,
        author: user.displayName || user.email || '파트너',
        authorId: user.uid,
        partnerId: user.uid,
        status,
        isVisible: formData.isVisible
      })

      alert(status === 'published' ? '공지사항이 게시되었습니다.' : '임시 저장되었습니다.')
      router.push('/partner/notice/management')
    } catch (error) {
      console.error('공지사항 저장 실패:', error)
      alert('공지사항 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>공지사항 작성</h1>
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
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="공지사항 내용을 입력하세요"
            rows={8}
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
            onClick={() => router.push('/partner/notice/management')}
            disabled={loading}
          >
            취소하기
          </button>
          <button
            className={styles.publishButton}
            onClick={() => handleSubmit('published')}
            disabled={loading}
          >
            게시하기
          </button>
        </div>
      </div>
    </div>
  )
}
