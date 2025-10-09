'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getUserChatRooms, ChatRoom } from '@/lib/services/chatService'
import styles from './ChatRoomList.module.css'

export default function ChatRoomList() {
  const router = useRouter()
  const { user } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    loadChatRooms()
  }, [user, router])

  const loadChatRooms = async () => {
    if (!user) return

    try {
      setLoading(true)
      const rooms = await getUserChatRooms(user.uid)
      setChatRooms(rooms)
    } catch (error) {
      console.error('채팅방 목록 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoomClick = (roomId: string) => {
    router.push(`/chat/${roomId}`)
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

  if (loading) {
    return <div className={styles.loading}>채팅방 목록을 불러오는 중...</div>
  }

  if (chatRooms.length === 0) {
    return (
      <div className={styles.empty}>
        <p>아직 채팅방이 없습니다.</p>
        <p>가게에 문의하여 채팅을 시작해보세요!</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>채팅</h1>
      <div className={styles.roomList}>
        {chatRooms.map((room) => (
          <div
            key={room.id}
            className={styles.roomItem}
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
    </div>
  )
}
