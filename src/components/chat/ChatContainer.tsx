'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getUserChatRooms, ChatRoom as ChatRoomType, getUnreadMessageCount } from '@/lib/services/chatService'
import { ref, onValue } from 'firebase/database'
import { realtimeDb } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import ChatRoom from './ChatRoom'
import styles from './ChatContainer.module.css'

interface ChatRoomWithName extends Omit<ChatRoomType, 'unreadCount'> {
  otherUserName?: string
  unreadCount?: number // 현재 사용자의 읽지 않은 메시지 수
}

interface ChatContainerProps {
  isPartner?: boolean
}

export default function ChatContainer({ isPartner = false }: ChatContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoomWithName[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  // 채팅방 목록 로드 (한 번만)
  useEffect(() => {
    // 인증 로딩 중이면 아무것도 하지 않음
    if (authLoading) return

    // 인증 완료 후 유저가 없으면 로그인 페이지로
    if (!user) {
      router.push('/login')
      return
    }

    loadChatRooms()
  }, [user, authLoading, router])

  // URL의 roomId 파라미터 처리
  useEffect(() => {
    const roomId = searchParams.get('roomId')
    if (roomId) {
      setSelectedRoomId(roomId)
    }
  }, [searchParams])

  // 실시간으로 전체 chatRooms의 unreadCount 구독 (한 번만 설정)
  useEffect(() => {
    if (!user) return

    console.log('[ChatContainer] chatRooms 전체 구독 시작')

    const chatRoomsRef = ref(realtimeDb, 'chatRooms')
    const unsubscribe = onValue(chatRoomsRef, (snapshot) => {
      if (!snapshot.exists()) return

      console.log('[ChatContainer] chatRooms 데이터 변경 감지')

      // 현재 chatRooms 상태와 비교하여 unreadCount만 업데이트
      setChatRooms(prevRooms => {
        return prevRooms.map(room => {
          const roomSnapshot = snapshot.child(room.id)
          if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.val()
            const unreadCount = roomData.unreadCount?.[user.uid] || 0

            // unreadCount가 변경된 경우에만 업데이트
            if (room.unreadCount !== unreadCount) {
              console.log(`[ChatContainer] 채팅방 ${room.id} unreadCount 업데이트: ${room.unreadCount} -> ${unreadCount}`)
              return { ...room, unreadCount }
            }
          }
          return room
        })
      })
    })

    return () => {
      console.log('[ChatContainer] chatRooms 구독 해제')
      unsubscribe()
    }
  }, [user])

  const loadChatRooms = async () => {
    if (!user) return

    console.log('[ChatContainer] loadChatRooms 시작:', {
      userId: user.uid,
      isPartner
    })

    try {
      const rooms = await getUserChatRooms(user.uid)
      console.log('[ChatContainer] 채팅방 목록:', rooms)

      // 각 채팅방의 상대방 이름과 읽지 않은 메시지 개수 가져오기
      const roomsWithNames = await Promise.all(
        rooms.map(async (room) => {
          // 상대방 ID 찾기
          const otherUserId = room.participants.find(id => id !== user.uid)

          // 읽지 않은 메시지 개수 가져오기
          const unreadCount = await getUnreadMessageCount(room.id, user.uid)

          if (otherUserId) {
            try {
              const otherUserDoc = await getDoc(doc(db, 'users', otherUserId))
              if (otherUserDoc.exists()) {
                const otherUserData = otherUserDoc.data()

                // 상대방이 파트너면 companyName, 일반 사용자면 name
                const otherUserType = otherUserData.type || 'user'
                const displayName = otherUserType === 'partner'
                  ? (otherUserData.companyName || otherUserData.storeName || '가게')
                  : (otherUserData.name || '사용자')

                return {
                  ...room,
                  otherUserName: displayName,
                  unreadCount
                }
              }
            } catch (error) {
              console.error('사용자 정보 로드 실패:', error)
            }
          }

          return {
            ...room,
            otherUserName: '사용자',
            unreadCount
          }
        })
      )

      console.log('[ChatContainer] 이름이 추가된 채팅방 목록:', roomsWithNames)
      setChatRooms(roomsWithNames)

      // URL에 roomId가 있으면 그것을 사용, 없으면 첫 번째 채팅방 선택하지 않음
      const urlRoomId = searchParams.get('roomId')
      if (urlRoomId) {
        setSelectedRoomId(urlRoomId)
      }
    } catch (error) {
      console.error('[ChatContainer] 채팅방 목록 로드 실패:', error)
    }
  }

  const handleRoomClick = (roomId: string) => {
    setSelectedRoomId(roomId)
    router.push(`/chat?roomId=${roomId}`, { scroll: false })
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (diffDays === 1) {
      return '어제'
    } else if (diffDays < 7) {
      return `${diffDays}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric'
      })
    }
  }

  if (authLoading) {
    return null
  }

  return (
    <div className={styles.container}>
      {/* 왼쪽: 채팅방 목록 */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.title}>채팅</h1>
        </div>

        {chatRooms.length === 0 ? (
          <div className={styles.emptyRooms}>
            <p>아직 채팅방이 없습니다.</p>
            <p>{isPartner ? '고객이 문의하면 채팅방이 생성됩니다.' : '가게에 문의하여 채팅을 시작해보세요!'}</p>
          </div>
        ) : (
          <div className={styles.roomList}>
            {chatRooms.map((room) => (
              <div
                key={room.id}
                className={`${styles.roomItem} ${selectedRoomId === room.id ? styles.selected : ''}`}
                onClick={() => handleRoomClick(room.id)}
              >
                <div className={styles.roomInfo}>
                  <div className={styles.roomHeader}>
                    <h3 className={styles.storeName}>{room.otherUserName || room.storeName}</h3>
                    {(room.unreadCount ?? 0) > 0 && (
                      <span className={styles.unreadBadge}>{room.unreadCount}</span>
                    )}
                  </div>
                  {room.lastMessage && (
                    <p className={styles.lastMessage}>{room.lastMessage}</p>
                  )}
                </div>
                {room.lastMessageTime && (
                  <span className={styles.time}>
                    {formatTime(room.lastMessageTime)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 오른쪽: 채팅방 상세 */}
      <div className={`${styles.mainContent} ${selectedRoomId ? styles.active : ''}`}>
        {selectedRoomId ? (
          <ChatRoom
            roomId={selectedRoomId}
            onBack={() => setSelectedRoomId(null)}
            isPartner={isPartner}
          />
        ) : (
          <div className={styles.emptyChat}>
            <p>채팅방을 선택해주세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
