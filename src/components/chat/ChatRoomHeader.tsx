'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getChatRoom } from '@/lib/services/chatService'
import { createReport } from '@/lib/services/reportService'
import { leaveChatRoom } from '@/lib/services/chatRoomService'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Header from '@/components/Header'
import PartnerHeader from '@/components/partner/PartnerHeader'
import ReportModal from './ReportModal'
import Image from 'next/image'
import styles from './ChatRoomHeader.module.css'

interface ChatRoomHeaderProps {
  roomId: string
  showFullHeader?: boolean // 모바일용 전체 헤더 표시 여부
}

export default function ChatRoomHeader({ roomId, showFullHeader = false }: ChatRoomHeaderProps) {
  const router = useRouter()
  const { user, userData } = useAuth()
  const [otherUserName, setOtherUserName] = useState<string>('')
  const [otherUserPhone, setOtherUserPhone] = useState<string>('')
  const [otherUserId, setOtherUserId] = useState<string>('')
  const [showMenu, setShowMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const isPartner = userData?.type === 'partner'

  useEffect(() => {
    const loadRoomData = async () => {
      if (!user) return

      try {
        const roomData = await getChatRoom(roomId)
        if (roomData) {
          // 상대방 이름과 전화번호 가져오기
          const foundOtherUserId = roomData.participants.find(id => id !== user.uid)
          if (foundOtherUserId) {
            setOtherUserId(foundOtherUserId)
            try {
              const otherUserDoc = await getDoc(doc(db, 'users', foundOtherUserId))
              if (otherUserDoc.exists()) {
                const otherUserData = otherUserDoc.data()

                const otherUserType = otherUserData.type || 'user'
                const displayName = otherUserType === 'partner'
                  ? (otherUserData.companyName || otherUserData.storeName || '가게')
                  : (otherUserData.name || '사용자')
                setOtherUserName(displayName)

                // 전화번호 저장
                if (otherUserData.phone) {
                  setOtherUserPhone(otherUserData.phone)
                }
              }
            } catch (error) {
              console.error('상대방 정보 로드 실패:', error)
              setOtherUserName(roomData.storeName || '사용자')
            }
          }
        }
      } catch (error) {
        console.error('채팅방 로드 실패:', error)
      }
    }

    loadRoomData()
  }, [user, roomId])

  // 채팅방 나가기 핸들러
  const handleLeaveChat = async () => {
    if (!confirm('채팅방에서 나가시겠습니까?\n상대방에게 나갔다는 알림이 전송됩니다.')) {
      return
    }

    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      setShowMenu(false)
      await leaveChatRoom(user.uid, roomId)
      alert('채팅방에서 나갔습니다.')
      router.push('/chat')
    } catch (error) {
      console.error('채팅방 나가기 실패:', error)
      alert('채팅방 나가기에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 신고 핸들러
  const handleReport = () => {
    setShowMenu(false)
    setShowReportModal(true)
  }

  // 신고 제출 핸들러
  const handleReportSubmit = async (reason: string, details: string) => {
    if (!user || !otherUserId) {
      throw new Error('사용자 정보가 없습니다.')
    }

    try {
      await createReport(user.uid, otherUserId, roomId, reason, details)
      alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.')
    } catch (error) {
      console.error('신고 제출 실패:', error)
      throw error
    }
  }

  // 모바일용 전체 헤더
  if (showFullHeader) {
    const title = otherUserName || ' '

    // 점 3개 메뉴 JSX
    const menuJSX = (
      <div className={styles.menuContainer}>
        <button
          className={styles.menuButton}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
        >
          ⋮
        </button>
        {showMenu && (
          <>
            <div className={styles.menuOverlay} onClick={() => setShowMenu(false)} />
            <div className={styles.menu}>
              <button className={styles.menuItem} onClick={handleLeaveChat}>
                채팅방 나가기
              </button>
              <div className={styles.menuDivider} />
              <button className={styles.menuItem} onClick={handleReport}>
                신고
              </button>
            </div>
          </>
        )}
      </div>
    )

    return (
      <>
        {isPartner ? (
          <PartnerHeader chatRoomTitle={title} chatRoomPhone={otherUserPhone} chatRoomMenu={menuJSX} />
        ) : (
          <Header chatRoomTitle={title} chatRoomPhone={otherUserPhone} chatRoomMenu={menuJSX} />
        )}

        {/* 신고 모달 */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportSubmit}
          reportedUserName={otherUserName}
        />
      </>
    )
  }

  // PC용 간단한 채팅방 헤더
  return (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>{otherUserName || '채팅방'}</h2>
        <div className={styles.menuContainer}>
          <button
            className={styles.menuButton}
            onClick={() => setShowMenu(!showMenu)}
          >
            ⋮
          </button>
          {showMenu && (
            <>
              <div className={styles.menuOverlay} onClick={() => setShowMenu(false)} />
              <div className={styles.menu}>
                <button className={styles.menuItem} onClick={handleLeaveChat}>
                  채팅방 나가기
                </button>
                <div className={styles.menuDivider} />
                <button className={styles.menuItem} onClick={handleReport}>
                  신고
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 신고 모달 */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        reportedUserName={otherUserName}
      />
    </>
  )
}
