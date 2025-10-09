'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getUserChatRooms, ChatRoom as ChatRoomType } from '@/lib/services/chatService'
import ChatRoom from './ChatRoom'
import styles from './ChatContainer.module.css'

export default function ChatContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoomType[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    const roomId = searchParams.get('roomId')
    if (roomId) {
      setSelectedRoomId(roomId)
    }
  }, [searchParams])

  const loadChatRooms = async () => {
    if (!user) return

    try {
      setLoading(true)
      const rooms = await getUserChatRooms(user.uid)
      setChatRooms(rooms)

      // URL에 roomId가 있으면 그것을 사용, 없으면 첫 번째 채팅방 선택하지 않음
      const urlRoomId = searchParams.get('roomId')
      if (urlRoomId) {
        setSelectedRoomId(urlRoomId)
      }
    } catch (error) {
      console.error('채팅방 목록 로드 실패:', error)
    } finally {
      setLoading(false)
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

  if (authLoading || loading) {
    return <div className={styles.loading}>채팅방 목록을 불러오는 중...</div>
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
            <p>가게에 문의하여 채팅을 시작해보세요!</p>
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
                  <h3 className={styles.storeName}>{room.storeName}</h3>
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
          <ChatRoom roomId={selectedRoomId} onBack={() => setSelectedRoomId(null)} />
        ) : (
          <div className={styles.emptyChat}>
            <p>채팅방을 선택해주세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
