'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getChatRoom } from '@/lib/services/chatService'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Header from '@/components/Header'
import PartnerHeader from '@/components/partner/PartnerHeader'

interface ChatRoomHeaderProps {
  roomId: string
}

export default function ChatRoomHeader({ roomId }: ChatRoomHeaderProps) {
  const router = useRouter()
  const { user, userData } = useAuth()
  const [otherUserName, setOtherUserName] = useState<string>('')
  const [otherUserPhone, setOtherUserPhone] = useState<string>('')
  const isPartner = userData?.type === 'partner'

  useEffect(() => {
    const loadRoomData = async () => {
      if (!user) return

      try {
        const roomData = await getChatRoom(roomId)
        if (roomData) {
          // 상대방 이름과 전화번호 가져오기
          const otherUserId = roomData.participants.find(id => id !== user.uid)
          if (otherUserId) {
            try {
              const otherUserDoc = await getDoc(doc(db, 'users', otherUserId))
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

  // Header에 채팅방 제목 전달 (로딩 중에도 빈 문자열이 아닌 공백 전달하여 뒤로가기 버튼 표시)
  const title = otherUserName || ' '

  if (isPartner) {
    return <PartnerHeader chatRoomTitle={title} chatRoomPhone={otherUserPhone} />
  }

  return <Header chatRoomTitle={title} chatRoomPhone={otherUserPhone} />
}
