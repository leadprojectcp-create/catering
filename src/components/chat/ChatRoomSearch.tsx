'use client'

import { useState, useEffect } from 'react'
import { ChatMessage } from '@/lib/services/chatService'
import styles from './ChatRoomSearch.module.css'

interface ChatRoomSearchProps {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessage[]
  onResultClick: (messageId: string) => void
}

export default function ChatRoomSearch({ isOpen, onClose, messages, onResultClick }: ChatRoomSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    // 메시지 검색 - 텍스트 메시지만 필터링
    const query = searchQuery.toLowerCase()
    const results = messages.filter(message => {
      // 이미지나 상품 메시지는 제외
      if (message.text.startsWith('[이미지]') || message.text.startsWith('[상품]')) {
        return false
      }
      return message.text.toLowerCase().includes(query)
    })

    setSearchResults(results)
  }, [searchQuery, messages])

  const handleResultClick = (messageId: string) => {
    onResultClick(messageId)
    onClose()
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className={styles.highlight}>{part}</mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>메시지 검색</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="메시지 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.results}>
          {searchQuery.trim() && searchResults.length === 0 ? (
            <div className={styles.noResults}>검색 결과가 없습니다</div>
          ) : searchResults.length > 0 ? (
            <>
              <div className={styles.resultCount}>
                {searchResults.length}개의 결과
              </div>
              {searchResults.map((message) => (
                <div
                  key={message.id}
                  className={styles.resultItem}
                  onClick={() => handleResultClick(message.id)}
                >
                  <div className={styles.resultText}>
                    {highlightText(message.text, searchQuery)}
                  </div>
                  <div className={styles.resultMeta}>
                    <span className={styles.resultSender}>{message.senderName}</span>
                    <span className={styles.resultTime}>{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className={styles.placeholder}>
              검색어를 입력하세요
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
