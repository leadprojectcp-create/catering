'use client'

import { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import '@/components/payments/types' // window.daum 타입 확장
import styles from './AddressSearchModal.module.css'

interface AddressSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: {
    address: string
    roadAddress: string
    jibunAddress: string
    zonecode: string
  }) => void
}

export default function AddressSearchModal({ isOpen, onClose, onComplete }: AddressSearchModalProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const postcodeRef = useRef<any>(null)

  // 스크립트 로드 확인
  useEffect(() => {
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      setIsScriptLoaded(true)
    }
  }, [])

  // 모달 열릴 때 임베디드 주소 검색창 생성
  useEffect(() => {
    if (isOpen && isScriptLoaded && containerRef.current) {
      // 기존 내용 초기화
      containerRef.current.innerHTML = ''

      postcodeRef.current = new window.daum!.Postcode({
        oncomplete: (data: any) => {
          const address = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress
          onComplete({
            address,
            roadAddress: data.roadAddress || '',
            jibunAddress: data.jibunAddress || '',
            zonecode: data.zonecode || ''
          })
          onClose()
        },
        width: '100%',
        height: '100%'
      })

      postcodeRef.current.embed(containerRef.current)
    }
  }, [isOpen, isScriptLoaded, onComplete, onClose])

  // 모달 바깥 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptLoaded(true)}
      />
      <div className={styles.backdrop} onClick={handleBackdropClick}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h3 className={styles.title}>주소 검색</h3>
            <button className={styles.closeButton} onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className={styles.content}>
            {!isScriptLoaded ? (
              <div className={styles.loading}>주소 검색 서비스 로딩 중...</div>
            ) : (
              <div ref={containerRef} className={styles.postcodeContainer} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
