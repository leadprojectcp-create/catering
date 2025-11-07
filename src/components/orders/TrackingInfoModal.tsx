'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './TrackingInfoModal.module.css'

interface TrackingInfoModalProps {
  carrier: string
  trackingNumber: string
  onClose: () => void
}

// 택배사별 조회 URL
const getTrackingUrl = (carrier: string, trackingNumber: string): string => {
  const carriers: { [key: string]: string } = {
    '우체국 택배': `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNumber}`,
    'CJ 대한통운': `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvNo=${trackingNumber}`,
    '롯데 택배': `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${trackingNumber}`,
    '한진 택배': `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${trackingNumber}`,
    'CU 편의점택배': `https://www.cupost.co.kr/postbox/delivery/shipping_result.jsp?invoice_no=${trackingNumber}`,
    '경동 택배': `https://kdexp.com/basicNewDelivery.kd?barcode=${trackingNumber}`,
    '일양로지스': `https://www.ilyanglogis.com/functionality/tracking_result.asp?hawb_no=${trackingNumber}`,
    'GS 포스트박스': `https://www.cvsnet.co.kr/invoice/tracking.do?invoice_no=${trackingNumber}`
  }

  return carriers[carrier] || `https://www.google.com/search?q=${encodeURIComponent(carrier + ' 송장조회 ' + trackingNumber)}`
}

export default function TrackingInfoModal({ carrier, trackingNumber, onClose }: TrackingInfoModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('복사 실패:', error)
      alert('복사에 실패했습니다.')
    }
  }

  const handleTrackingClick = () => {
    const url = getTrackingUrl(carrier, trackingNumber)
    window.open(url, '_blank')
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>택배 정보</h2>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.infoSection}>
            <div className={styles.infoRow}>
              <span className={styles.label}>택배사</span>
              <span className={styles.value}>{carrier}</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.label}>송장번호</span>
              <div className={styles.trackingNumberBox}>
                <span className={styles.trackingNumber}>{trackingNumber}</span>
                <button className={styles.copyButton} onClick={handleCopy}>
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13 4L6 11L3 8" stroke="#025BD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.3333 6H7.33333C6.59695 6 6 6.59695 6 7.33333V13.3333C6 14.0697 6.59695 14.6667 7.33333 14.6667H13.3333C14.0697 14.6667 14.6667 14.0697 14.6667 13.3333V7.33333C14.6667 6.59695 14.0697 6 13.3333 6Z" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.33333 10H2.66667C2.31304 10 1.97391 9.85952 1.72386 9.60947C1.47381 9.35942 1.33333 9.02029 1.33333 8.66667V2.66667C1.33333 2.31304 1.47381 1.97391 1.72386 1.72386C1.97391 1.47381 2.31304 1.33333 2.66667 1.33333H8.66667C9.02029 1.33333 9.35942 1.47381 9.60947 1.72386C9.85952 1.97391 10 2.31304 10 2.66667V3.33333" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.trackingButton} onClick={handleTrackingClick}>
            송장 조회하기
          </button>
        </div>
      </div>
    </div>
  )
}
