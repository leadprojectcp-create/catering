'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getNotice, updateNotice, type NoticeCategory, type NoticeTargetType } from '@/lib/services/noticeService'
import { useAuth } from '@/contexts/AuthContext'
import CustomEditor from '@/components/common/CustomEditor'
import Loading from '@/components/Loading'
import styles from './NoticeWritePage.module.css'

interface NoticeEditPageProps {
  id: string
}

export default function NoticeEditPage({ id }: NoticeEditPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetType: 'all' as NoticeTargetType,
    category: 'general' as NoticeCategory,
    status: 'draft' as 'draft' | 'published'
  })

  useEffect(() => {
    fetchNotice()
  }, [id])

  const fetchNotice = async () => {
    try {
      setLoading(true)
      const notice = await getNotice(id)
      if (notice) {
        setFormData({
          title: notice.title,
          content: notice.content,
          targetType: notice.targetType,
          category: notice.category || 'general',
          status: notice.status
        })
      } else {
        alert('공지사항을 찾을 수 없습니다.')
        router.push('/admin/notices')
      }
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
      alert('공지사항을 불러오는데 실패했습니다.')
      router.push('/admin/notices')
    } finally {
      setLoading(false)
    }
  }

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
      await updateNotice(id, {
        title: formData.title,
        content: formData.content,
        targetType: formData.targetType,
        category: formData.category,
        status
      })

      alert(status === 'published' ? '공지사항이 게시되었습니다.' : '임시 저장되었습니다.')
      router.push('/admin/notices')
    } catch (error) {
      console.error('공지사항 수정 실패:', error)
      alert('공지사항 수정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>공지사항 수정</h1>
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
          <label className={styles.label}>카테고리 *</label>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="category"
                value="general"
                checked={formData.category === 'general'}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as NoticeCategory }))}
              />
              <span>일반</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="category"
                value="event"
                checked={formData.category === 'event'}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as NoticeCategory }))}
              />
              <span>이벤트</span>
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
