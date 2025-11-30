'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { EVENTS } from '../common/types/types'
import styles from './EventSection.module.css'

interface EventSectionProps {
  events: string[]
  onEventChange: (events: string[]) => void
  thumbnailFile?: File
  thumbnailUrl?: string
}

export default function EventSection({
  events,
  onEventChange,
  thumbnailFile,
  thumbnailUrl
}: EventSectionProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiReason, setAiReason] = useState('')

  const handleEventToggle = (event: string) => {
    if (events.includes(event)) {
      onEventChange(events.filter(e => e !== event))
    } else {
      onEventChange([...events, event])
    }
  }

  // File을 base64로 변환
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // 이미지가 있는지 확인
  const hasImage = thumbnailFile || thumbnailUrl

  const handleAnalyzeThumbnail = async () => {
    if (!hasImage) {
      alert('썸네일 이미지를 먼저 업로드해주세요.')
      return
    }

    setIsAnalyzing(true)
    setAiReason('')

    try {
      let requestBody: { imageBase64?: string; thumbnailUrl?: string } = {}

      // 새 이미지 파일이 있으면 base64로 변환
      if (thumbnailFile) {
        const base64Data = await fileToBase64(thumbnailFile)
        requestBody = { imageBase64: base64Data }
      } else if (thumbnailUrl) {
        // 기존 이미지 URL 사용
        requestBody = { thumbnailUrl }
      }

      const response = await fetch('/api/products/analyze-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        onEventChange(data.recommendedEvents)
        setAiReason(data.reason)
      } else {
        alert(data.error || 'AI 분석에 실패했습니다.')
      }
    } catch (error) {
      console.error('AI 분석 실패:', error)
      alert('AI 분석 중 오류가 발생했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.eventHeader}>
        <div className={styles.titleWithNumber}>
          <span className={styles.numberCircle}>5</span>
          <span className={styles.sectionTitle}>이벤트 카테고리</span>
          <span className={styles.optionalLabel}>(선택)</span>
        </div>
        <button
          type="button"
          onClick={handleAnalyzeThumbnail}
          disabled={isAnalyzing || !hasImage}
          className={styles.aiButton}
        >
          {isAnalyzing ? 'AI 분석중...' : '🤖 AI로 추천받기'}
        </button>
      </div>

      {aiReason && (
        <div className={styles.aiReason}>
          <span className={styles.aiReasonLabel}>AI 추천 이유:</span> {aiReason}
        </div>
      )}

      <div className={styles.eventList}>
        {EVENTS.map((event) => (
          <label key={event} className={styles.eventItem}>
            <input
              type="checkbox"
              checked={events.includes(event)}
              onChange={() => handleEventToggle(event)}
              className={styles.eventCheckbox}
            />
            <Image
              src={events.includes(event) ? '/icons/check_active.png' : '/icons/check_empty.png'}
              alt={events.includes(event) ? '선택됨' : '선택안됨'}
              width={24}
              height={24}
              className={styles.checkIcon}
            />
            <span className={styles.eventLabel}>{event}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
