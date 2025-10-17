'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createNotice } from '@/lib/services/noticeService'
import { useAuth } from '@/contexts/AuthContext'
import type { NoticeTargetType } from '@/types/notice'
import CustomEditor from '@/components/common/CustomEditor'
import Loading from '@/components/Loading'
import styles from './NoticeWritePage.module.css'

export default function NoticeWritePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetType: 'all' as NoticeTargetType,
    status: 'draft' as 'draft' | 'published'
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
        targetType: formData.targetType,
        author: user.displayName || user.email || '관리자',
        authorId: user.uid,
        status
      })

      alert(status === 'published' ? '공지사항이 게시되었습니다.' : '임시 저장되었습니다.')
      router.push('/admin/notices')
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
        <h1 className={styles.title}>새 공지사항 작성</h1>
        <button
          className={styles.cancelButton}
          onClick={() => router.push('/admin/notices')}
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
          <label className={styles.label}>대상 선택 *</label>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="targetType"
                value="all"
                checked={formData.targetType === 'all'}
                onChange={(e) => setFormData(prev => ({ ...prev, targetType: e.target.value as NoticeTargetType }))}
              />
              <span>전체</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="targetType"
                value="partner"
                checked={formData.targetType === 'partner'}
                onChange={(e) => setFormData(prev => ({ ...prev, targetType: e.target.value as NoticeTargetType }))}
              />
              <span>파트너</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="targetType"
                value="user"
                checked={formData.targetType === 'user'}
                onChange={(e) => setFormData(prev => ({ ...prev, targetType: e.target.value as NoticeTargetType }))}
              />
              <span>일반 유저</span>
            </label>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>내용 *</label>
          <div className={styles.editorWrapper}>
            <CustomEditor
              value={formData.content}
              onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
              placeholder="공지사항 내용을 입력하세요"
            />
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            className={styles.saveDraftButton}
            onClick={() => handleSubmit('draft')}
            disabled={loading}
          >
            임시 저장
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
