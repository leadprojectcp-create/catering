'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { collection, query, orderBy, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore'
import Loading from '@/components/Loading'
import styles from './AdminSurveyManagementPage.module.css'

interface Survey {
  id: string
  userId: string
  aiRecommendation: string
  bulkOrderExperience: string
  createdAt: Timestamp
  updatedAt: Timestamp
  deliveryMethod: string
  difficulties: string[]
  difficultiesOther: string
  feeStructure: string
  feeStructureOther: string
  importantSupport: string
  importantSupportOther: string
  instagramScreenshotUrl: string
  orderManagement: string
  productTypes: string[]
  suggestions: string
}

interface UserInfo {
  userType: 'customer' | 'partner'
  name?: string
  storeName?: string
  businessOwner?: string
}

export default function AdminSurveyManagementPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSurveyId, setExpandedSurveyId] = useState<string | null>(null)
  const [imageModal, setImageModal] = useState<string | null>(null)
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({})

  // 사용자 정보 가져오기
  const fetchUserInfo = async (userId: string): Promise<UserInfo | null> => {
    try {
      // users 컬렉션에서 사용자 정보 조회
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (!userDoc.exists()) return null

      const userData = userDoc.data()
      const type = userData.type as 'user' | 'partner'

      if (type === 'partner') {
        // 파트너인 경우 stores 컬렉션에서 추가 정보 조회
        const storeDoc = await getDoc(doc(db, 'stores', userId))
        if (storeDoc.exists()) {
          const storeData = storeDoc.data()
          return {
            userType: 'partner',
            storeName: storeData.storeName,
            businessOwner: storeData.businessOwner
          }
        }
        return { userType: 'partner' }
      } else {
        // 일반 유저인 경우
        return {
          userType: 'customer',
          name: userData.name
        }
      }
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error)
      return null
    }
  }

  useEffect(() => {
    const surveysQuery = query(
      collection(db, 'surveys'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      surveysQuery,
      async (snapshot) => {
        const surveysData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Survey[]
        setSurveys(surveysData)

        // 모든 사용자 정보 가져오기
        const userIds = [...new Set(surveysData.map(s => s.userId))]
        const newUserInfoMap: Record<string, UserInfo> = {}

        await Promise.all(
          userIds.map(async (userId) => {
            if (!userInfoMap[userId]) {
              const info = await fetchUserInfo(userId)
              if (info) {
                newUserInfoMap[userId] = info
              }
            }
          })
        )

        setUserInfoMap(prev => ({ ...prev, ...newUserInfoMap }))
        setLoading(false)
      },
      (error) => {
        console.error('설문조사 목록 로드 실패:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate()
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleExpand = (surveyId: string) => {
    setExpandedSurveyId(expandedSurveyId === surveyId ? null : surveyId)
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>설문조사 관리</h1>
        <p className={styles.subtitle}>총 {surveys.length}건의 설문조사</p>
      </div>

      <div className={styles.surveyList}>
        {surveys.length === 0 ? (
          <div className={styles.emptyState}>
            등록된 설문조사가 없습니다.
          </div>
        ) : (
          surveys.map((survey) => (
            <div key={survey.id} className={styles.surveyCard}>
              <div
                className={styles.surveyHeader}
                onClick={() => toggleExpand(survey.id)}
              >
                <div className={styles.surveyBasicInfo}>
                  <span className={styles.surveyDate}>{formatDate(survey.createdAt)}</span>
                  {userInfoMap[survey.userId] ? (
                    userInfoMap[survey.userId].userType === 'partner' ? (
                      <span className={styles.userBadgePartner}>
                        파트너 | {userInfoMap[survey.userId].storeName || '-'} ({userInfoMap[survey.userId].businessOwner || '-'})
                      </span>
                    ) : (
                      <span className={styles.userBadgeCustomer}>
                        일반유저 | {userInfoMap[survey.userId].name || '-'}
                      </span>
                    )
                  ) : (
                    <span className={styles.userId}>사용자: {survey.userId.slice(0, 8)}...</span>
                  )}
                  <span className={styles.productTypes}>
                    {survey.productTypes?.join(', ') || '-'}
                  </span>
                </div>
                <span className={styles.expandIcon}>
                  {expandedSurveyId === survey.id ? '▲' : '▼'}
                </span>
              </div>

              {expandedSurveyId === survey.id && (
                <div className={styles.surveyDetail}>
                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>기본 정보</h3>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>사용자 ID</span>
                        <span className={styles.detailValue}>{survey.userId}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>사용자 유형</span>
                        <span className={styles.detailValue}>
                          {userInfoMap[survey.userId]?.userType === 'partner' ? '파트너' : '일반유저'}
                        </span>
                      </div>
                      {userInfoMap[survey.userId]?.userType === 'partner' ? (
                        <>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>판매자명</span>
                            <span className={styles.detailValue}>{userInfoMap[survey.userId]?.storeName || '-'}</span>
                          </div>
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>대표자명</span>
                            <span className={styles.detailValue}>{userInfoMap[survey.userId]?.businessOwner || '-'}</span>
                          </div>
                        </>
                      ) : (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>이름</span>
                          <span className={styles.detailValue}>{userInfoMap[survey.userId]?.name || '-'}</span>
                        </div>
                      )}
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>등록일</span>
                        <span className={styles.detailValue}>{formatDate(survey.createdAt)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>수정일</span>
                        <span className={styles.detailValue}>{formatDate(survey.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>판매 정보</h3>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>판매 품목</span>
                        <span className={styles.detailValue}>
                          {survey.productTypes?.length > 0
                            ? survey.productTypes.join(', ')
                            : '-'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>단체 주문 경험</span>
                        <span className={styles.detailValue}>{survey.bulkOrderExperience || '-'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>선호 배송 방법</span>
                        <span className={styles.detailValue}>{survey.deliveryMethod || '-'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>주문 관리 방식</span>
                        <span className={styles.detailValue}>{survey.orderManagement || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>어려움 및 지원</h3>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>겪는 어려움</span>
                        <span className={styles.detailValue}>
                          {survey.difficulties?.length > 0
                            ? survey.difficulties.join(', ')
                            : '-'}
                          {survey.difficultiesOther && ` (기타: ${survey.difficultiesOther})`}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>중요 지원</span>
                        <span className={styles.detailValue}>
                          {survey.importantSupport || '-'}
                          {survey.importantSupportOther && ` (기타: ${survey.importantSupportOther})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>서비스 의견</h3>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>AI 추천 시스템</span>
                        <span className={styles.detailValue}>{survey.aiRecommendation || '-'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>수수료 체계</span>
                        <span className={styles.detailValue}>
                          {survey.feeStructure || '-'}
                          {survey.feeStructureOther && ` (기타: ${survey.feeStructureOther})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {survey.suggestions && (
                    <div className={styles.detailSection}>
                      <h3 className={styles.sectionTitle}>건의사항</h3>
                      <p className={styles.suggestions}>{survey.suggestions}</p>
                    </div>
                  )}

                  {survey.instagramScreenshotUrl && (
                    <div className={styles.detailSection}>
                      <h3 className={styles.sectionTitle}>인스타그램 스크린샷</h3>
                      <div
                        className={styles.screenshotWrapper}
                        onClick={() => setImageModal(survey.instagramScreenshotUrl)}
                      >
                        <Image
                          src={survey.instagramScreenshotUrl}
                          alt="인스타그램 스크린샷"
                          width={200}
                          height={200}
                          className={styles.screenshot}
                        />
                        <span className={styles.clickToEnlarge}>클릭하여 확대</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 이미지 모달 */}
      {imageModal && (
        <div className={styles.imageModal} onClick={() => setImageModal(null)}>
          <div className={styles.imageModalContent}>
            <Image
              src={imageModal}
              alt="인스타그램 스크린샷"
              width={600}
              height={800}
              className={styles.modalImage}
            />
            <button
              className={styles.closeModal}
              onClick={() => setImageModal(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
