'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  getChatRoom,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  ChatRoom as ChatRoomType,
  ChatMessage
} from '@/lib/services/chatService'
import styles from './ChatRoom.module.css'

interface ChatRoomProps {
  roomId: string
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [room, setRoom] = useState<ChatRoomType | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    loadRoomData()
  }, [user, roomId, router])

  useEffect(() => {
    if (!user || !roomId) return

    // 메시지 실시간 구독
    const unsubscribe = subscribeToMessages(roomId, (newMessages) => {
      setMessages(newMessages)
      scrollToBottom()
      // 다른 사용자의 메시지 읽음 처리
      markMessagesAsRead(roomId, user.uid)
    })

    return () => {
      unsubscribe()
    }
  }, [user, roomId])

  const loadRoomData = async () => {
    try {
      setLoading(true)
      const roomData = await getChatRoom(roomId)
      if (roomData) {
        setRoom(roomData)
      } else {
        alert('채팅방을 찾을 수 없습니다.')
        router.push('/chat')
      }
    } catch (error) {
      console.error('채팅방 로드 실패:', error)
      alert('채팅방을 불러오는데 실패했습니다.')
      router.push('/chat')
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !inputText.trim()) return

    try {
      await sendMessage(roomId, user.uid, user.displayName || '사용자', inputText.trim())
      setInputText('')
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      alert('메시지 전송에 실패했습니다.')
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()

    if (date.toDateString() === today.toDateString()) {
      return '오늘'
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return '어제'
    }

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderMessages = () => {
    const messagesByDate: { [key: string]: ChatMessage[] } = {}

    messages.forEach((message) => {
      const dateKey = new Date(message.timestamp).toDateString()
      if (!messagesByDate[dateKey]) {
        messagesByDate[dateKey] = []
      }
      messagesByDate[dateKey].push(message)
    })

    return Object.entries(messagesByDate).map(([dateKey, msgs]) => (
      <div key={dateKey}>
        <div className={styles.dateDivider}>
          {formatDate(msgs[0].timestamp)}
        </div>
        {msgs.map((message) => (
          <div
            key={message.id}
            className={`${styles.messageItem} ${
              message.senderId === user?.uid ? styles.myMessage : styles.otherMessage
            }`}
          >
            {message.senderId !== user?.uid && (
              <span className={styles.senderName}>{message.senderName}</span>
            )}
            <div className={styles.messageContent}>
              <div className={styles.messageBubble}>{message.text}</div>
              <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    ))
  }

  if (loading) {
    return <div className={styles.loading}>채팅방을 불러오는 중...</div>
  }

  if (!room) {
    return <div className={styles.error}>채팅방을 찾을 수 없습니다.</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()}>
          ←
        </button>
        <h1 className={styles.title}>{room.storeName}</h1>
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>메시지를 보내 대화를 시작해보세요!</p>
          </div>
        ) : (
          renderMessages()
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.inputContainer} onSubmit={handleSendMessage}>
        <input
          type="text"
          className={styles.input}
          placeholder="메시지를 입력하세요..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!inputText.trim()}
        >
          전송
        </button>
      </form>
    </div>
  )
}
