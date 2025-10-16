'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatContainer from '@/components/chat/ChatContainer'
import Header from '@/components/Header'
import PartnerHeader from '@/components/partner/PartnerHeader'
import Loading from '@/components/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { getChatRoom } from '@/lib/services/chatService'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function ChatPage() {
  const { userData, user } = useAuth()
  const isPartner = userData?.type === 'partner'
  const searchParams = useSearchParams()
  const roomId = searchParams.get('roomId')

  // roomId가 있으면 초기값을 공백으로 설정 (로딩 중 표시용)
  const [selectedRoomName, setSelectedRoomName] = useState<string>(roomId ? ' ' : '')

  // URL에 roomId가 있으면 채팅방 정보를 불러와서 이름 설정
  useEffect(() => {
    if (!roomId || !user) {
      setSelectedRoomName('')
      return
    }

    const loadRoomName = async () => {
      try {
        const roomData = await getChatRoom(roomId)
        if (roomData) {
          // 상대방 ID 찾기
          const otherUserId = roomData.participants.find(id => id !== user.uid)
          if (otherUserId) {
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId))
            if (otherUserDoc.exists()) {
              const otherUserData = otherUserDoc.data()
              const otherUserType = otherUserData.type || 'user'
              const displayName = otherUserType === 'partner'
                ? (otherUserData.companyName || otherUserData.storeName || '가게')
                : (otherUserData.name || '사용자')
              setSelectedRoomName(displayName)
            }
          }
        }
      } catch (error) {
        console.error('채팅방 이름 로드 실패:', error)
        setSelectedRoomName('')
      }
    }

    loadRoomName()
  }, [searchParams, user, roomId])

  return (
    <>
      {isPartner ? (
        <PartnerHeader chatRoomTitle={selectedRoomName || undefined} />
      ) : (
        <Header chatRoomTitle={selectedRoomName || undefined} />
      )}
      <Suspense fallback={<Loading />}>
        <ChatContainer isPartner={isPartner} onRoomSelect={setSelectedRoomName} />
      </Suspense>
    </>
  )
}
