'use client'

import { useEffect, useState, useRef, useLayoutEffect, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import {
  getChatRoom,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  ChatRoom as ChatRoomType,
  ChatMessage
} from '@/lib/services/chatService'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getProduct, ProductData } from '@/lib/services/productService'
import ChatMessageAttachment from './ChatMessageAttachment'
import ProductSelectPopup from './ProductSelectPopup'
import ProductMessageCard from './ProductMessageCard'
import ImageViewerPopup from './ImageViewerPopup'
import ChatRoomHeader from './ChatRoomHeader'
import styles from './ChatRoom.module.css'

interface ChatRoomProps {
  roomId: string
  onBack?: () => void
  isPartner?: boolean
  initialProductId?: string | null
  initialMessage?: string | null
  showHeader?: boolean
  onSearchResultsChange?: (count: number, currentIndex: number) => void
}

export interface ChatRoomRef {
  search: (query: string) => void
  nextResult: () => void
  prevResult: () => void
  getSearchResults: () => { count: number; currentIndex: number }
}

const ChatRoom = forwardRef<ChatRoomRef, ChatRoomProps>(({ roomId, onBack, isPartner = false, initialProductId, initialMessage, showHeader = false, onSearchResultsChange }, ref) => {
  const router = useRouter()
  const { user, userData, loading: authLoading } = useAuth()
  const [room, setRoom] = useState<ChatRoomType | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [otherUserName, setOtherUserName] = useState<string>('')
  const [showAttachmentPopup, setShowAttachmentPopup] = useState(false)
  const [showProductPopup, setShowProductPopup] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingProductId, setPendingProductId] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [pendingProduct, setPendingProduct] = useState<ProductData | null>(null)
  const [uploadingImages, setUploadingImages] = useState<{ id: string; preview: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([])
  const [currentResultIndex, setCurrentResultIndex] = useState(0)
  const [inputWidth, setInputWidth] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ref를 통해 부모 컴포넌트에서 호출할 수 있는 메서드 노출
  useImperativeHandle(ref, () => ({
    search: (query: string) => {
      performSearch(query)
    },
    nextResult: () => {
      if (searchResults.length === 0) return
      const nextIndex = (currentResultIndex + 1) % searchResults.length
      setCurrentResultIndex(nextIndex)
      scrollToMessage(searchResults[nextIndex].id)
      onSearchResultsChange?.(searchResults.length, nextIndex)
    },
    prevResult: () => {
      if (searchResults.length === 0) return
      const prevIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1
      setCurrentResultIndex(prevIndex)
      scrollToMessage(searchResults[prevIndex].id)
      onSearchResultsChange?.(searchResults.length, prevIndex)
    },
    getSearchResults: () => ({
      count: searchResults.length,
      currentIndex: currentResultIndex
    })
  }), [searchResults, currentResultIndex, onSearchResultsChange])

  const performSearch = (query: string) => {
    console.log('[ChatRoom] 검색 실행:', query)
    setSearchQuery(query)

    if (!query.trim()) {
      setSearchResults([])
      setCurrentResultIndex(0)
      onSearchResultsChange?.(0, 0)
      return
    }

    // 메시지 검색 - 텍스트 메시지만 필터링
    const queryLower = query.toLowerCase()
    const results = messages.filter(message => {
      // 이미지나 상품 메시지는 제외
      if (message.text.startsWith('[이미지]') || message.text.startsWith('[상품]')) {
        return false
      }
      return message.text.toLowerCase().includes(queryLower)
    })

    console.log('[ChatRoom] 검색 결과:', results.length, '개')
    setSearchResults(results)
    setCurrentResultIndex(0)
    onSearchResultsChange?.(results.length, 0)

    // 첫 번째 결과로 스크롤
    if (results.length > 0) {
      scrollToMessage(results[0].id)
    }
  }

  useEffect(() => {
    // 인증 로딩 중이면 아무것도 하지 않음
    if (authLoading) return

    // 인증 완료 후 유저가 없으면 로그인 페이지로
    if (!user) {
      router.push('/login')
      return
    }

    loadRoomData()

    // 채팅방 진입 시 즉시 읽음 처리
    const markAsReadOnEntry = async () => {
      if (!user) return
      try {
        console.log('[ChatRoom] 채팅방 진입 - 읽음 처리 시작')
        await markMessagesAsRead(roomId, user.uid)
        console.log('[ChatRoom] 읽음 처리 완료')
      } catch (error) {
        console.error('[ChatRoom] 읽음 처리 실패:', error)
      }
    }

    markAsReadOnEntry()

    // 채팅방 진입 시 활성 채팅방 ID 및 타임스탬프 저장 (FCM 알림 제어용)
    const setActiveRoom = async () => {
      if (!user) return
      try {
        const { ref, set, serverTimestamp } = await import('firebase/database')
        const { realtimeDb } = await import('@/lib/firebase')
        const activeRoomRef = ref(realtimeDb, `users/${user.uid}/activeRoom`)
        await set(activeRoomRef, {
          roomId: roomId,
          timestamp: serverTimestamp()
        })
        console.log('[ChatRoom] 활성 채팅방 설정:', roomId)
      } catch (error) {
        console.error('[ChatRoom] 활성 채팅방 설정 실패:', error)
      }
    }

    setActiveRoom()

    // 주기적으로 타임스탬프 업데이트 (5초마다)
    const intervalId = setInterval(() => {
      setActiveRoom()
    }, 5000)

    // 채팅방 퇴장 시 활성 채팅방 정보 제거
    return () => {
      clearInterval(intervalId)
      const clearActiveRoom = async () => {
        if (!user) return
        try {
          const { ref, remove } = await import('firebase/database')
          const { realtimeDb } = await import('@/lib/firebase')
          const activeRoomRef = ref(realtimeDb, `users/${user.uid}/activeRoom`)
          await remove(activeRoomRef)
          console.log('[ChatRoom] 활성 채팅방 해제')
        } catch (error) {
          console.error('[ChatRoom] 활성 채팅방 해제 실패:', error)
        }
      }
      clearActiveRoom()
    }
  }, [user, authLoading, roomId, router])

  // 초기 상품 및 메시지 확인 모달 표시 (한 번만 실행)
  useEffect(() => {
    if (!user || !room) return
    if (!initialProductId && !initialMessage) return

    let isModalShown = false

    const showConfirmationModal = async () => {
      if (isModalShown) return
      isModalShown = true

      // 상품 정보 로드
      if (initialProductId) {
        try {
          const product = await getProduct(initialProductId)
          if (product) {
            setPendingProduct(product)
          }
        } catch (error) {
          console.error('[ChatRoom] 상품 정보 로드 실패:', error)
        }
      }

      // 모달에 전달할 데이터 설정
      setPendingProductId(initialProductId || null)
      setPendingMessage(initialMessage || null)
      setShowConfirmModal(true)

      console.log('[ChatRoom] 확인 모달 표시:', { initialProductId, initialMessage })
    }

    showConfirmationModal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, room, roomId]) // initialProductId, initialMessage를 의존성에서 제외하여 한 번만 실행

  useEffect(() => {
    if (!user || !roomId) return

    console.log('[ChatRoom] 메시지 구독 시작:', roomId)

    // 메시지 실시간 구독
    const unsubscribe = subscribeToMessages(roomId, (newMessages) => {
      console.log('[ChatRoom] 새 메시지 받음:', newMessages.length, '개')
      setMessages(newMessages)
    })

    return () => {
      console.log('[ChatRoom] 메시지 구독 해제')
      unsubscribe()
    }
  }, [user, roomId])

  // 입력창 포커스 핸들러 (읽음 처리는 채팅방 진입 시 자동 처리됨)

  // 역순 렌더링 방식에서는 강제 스크롤이 필요 없음

  // input width 동적 계산
  useEffect(() => {
    const calculateInputWidth = () => {
      const screenWidth = window.innerWidth
      // attachButton(44) + sendButton(44) + gap(6*2) + padding(8*2) = 116
      const calculatedWidth = screenWidth - 44 - 44 - 6 - 6 - 16
      setInputWidth(calculatedWidth)
    }

    calculateInputWidth()
    window.addEventListener('resize', calculateInputWidth)

    return () => {
      window.removeEventListener('resize', calculateInputWidth)
    }
  }, [])

  const loadRoomData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const roomData = await getChatRoom(roomId)
      if (roomData) {
        setRoom(roomData)

        // 상대방 이름 가져오기
        const otherUserId = roomData.participants.find(id => id !== user.uid)
        if (otherUserId) {
          try {
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId))
            if (otherUserDoc.exists()) {
              const otherUserData = otherUserDoc.data()

              console.log('[ChatRoom] 상대방 정보:', {
                userId: otherUserId,
                type: otherUserData.type,
                name: otherUserData.name,
                companyName: otherUserData.companyName
              })

              // 상대방이 파트너면 companyName, 일반 사용자면 name
              const otherUserType = otherUserData.type || 'user'
              const displayName = otherUserType === 'partner'
                ? (otherUserData.companyName || '가게')
                : (otherUserData.name || '사용자')

              console.log('[ChatRoom] 표시할 이름:', displayName)
              setOtherUserName(displayName)
            }
          } catch (error) {
            console.error('상대방 정보 로드 실패:', error)
            setOtherUserName('사용자')
          }
        }
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

  // scrollToBottom 함수 제거 (역순 렌더링에서는 불필요)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !inputText.trim()) return

    try {
      // userData에서 실제 이름 가져오기
      const senderName = userData?.type === 'partner'
        ? (userData.companyName || '가게')
        : (userData?.name || user.displayName || '사용자')

      await sendMessage(roomId, user.uid, senderName, inputText.trim())
      setInputText('')
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      alert('메시지 전송에 실패했습니다.')
    }
  }

  const handleImageSelect = async (file: File) => {
    if (!user) return

    // 미리보기 생성
    const previewUrl = URL.createObjectURL(file)
    const uploadId = `upload-${Date.now()}`

    // 업로드 중인 이미지 추가 (useLayoutEffect가 자동으로 스크롤 처리)
    setUploadingImages(prev => [...prev, { id: uploadId, preview: previewUrl }])

    setIsUploading(true)
    try {
      // FormData 생성
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'chat')

      // 업로드 API 호출
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다.')
      }

      const data = await response.json()

      // userData에서 실제 이름 가져오기
      const senderName = userData?.type === 'partner'
        ? (userData.companyName || '가게')
        : (userData?.name || user.displayName || '사용자')

      // 이미지 URL을 메시지로 전송
      await sendMessage(roomId, user.uid, senderName, `[이미지]${data.url}`)

      console.log('이미지 업로드 및 전송 완료:', data.url)

      // 업로드 완료 후 미리보기 제거
      setUploadingImages(prev => prev.filter(img => img.id !== uploadId))
      URL.revokeObjectURL(previewUrl)
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      alert('이미지 업로드에 실패했습니다.')
      // 실패 시에도 미리보기 제거
      setUploadingImages(prev => prev.filter(img => img.id !== uploadId))
      URL.revokeObjectURL(previewUrl)
    } finally {
      setIsUploading(false)
    }
  }

  const handleProductSelect = () => {
    setShowProductPopup(true)
  }

  const handleProductChosen = async (product: { id: string; name: string; price: number; imageUrl?: string }) => {
    if (!user) return

    try {
      console.log('[ChatRoom] 선택한 상품:', product)

      // userData에서 실제 이름 가져오기
      const senderName = userData?.type === 'partner'
        ? (userData.companyName || '가게')
        : (userData?.name || user.displayName || '사용자')

      // 상품 ID만 전송
      const productMessage = `[상품]${product.id}`
      console.log('[ChatRoom] 전송할 메시지:', productMessage)

      await sendMessage(roomId, user.uid, senderName, productMessage)
      setShowProductPopup(false)

      console.log('[ChatRoom] 상품 전송 완료:', product.id)
    } catch (error) {
      console.error('[ChatRoom] 상품 전송 실패:', error)
      alert('상품 전송에 실패했습니다.')
    }
  }

  const handleConfirmInquiry = async () => {
    if (!user) return

    try {
      // userData에서 실제 이름 가져오기
      const senderName = userData?.type === 'partner'
        ? (userData.companyName || '가게')
        : (userData?.name || user.displayName || '사용자')

      // 상품 메시지 전송
      if (pendingProductId) {
        await sendMessage(roomId, user.uid, senderName, `[상품]${pendingProductId}`)
      }

      // 텍스트 메시지 전송
      if (pendingMessage) {
        await sendMessage(roomId, user.uid, senderName, pendingMessage)
      }

      console.log('[ChatRoom] 상품 문의 전송 완료')

      // 모달 닫기 및 상태 초기화
      setShowConfirmModal(false)
      setPendingProductId(null)
      setPendingMessage(null)
      setPendingProduct(null)
    } catch (error) {
      console.error('[ChatRoom] 상품 문의 전송 실패:', error)
      alert('메시지 전송에 실패했습니다.')
    }
  }

  const handleCancelInquiry = () => {
    console.log('[ChatRoom] 상품 문의 취소')

    // 모달 닫기 및 상태 초기화
    setShowConfirmModal(false)
    setPendingProductId(null)
    setPendingMessage(null)
    setPendingProduct(null)
  }

  const scrollToMessage = (messageId: string) => {
    // 해당 메시지로 스크롤
    const messageElement = document.getElementById(`message-${messageId}`)
    if (messageElement && messagesContainerRef.current) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // 하이라이트 효과
      messageElement.classList.add(styles.highlighted)
      setTimeout(() => {
        messageElement.classList.remove(styles.highlighted)
      }, 2000)
    }
  }

  const handleSearchResultClick = (messageId: string) => {
    scrollToMessage(messageId)
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

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR')
  }

  // 검색어 하이라이트
  const highlightSearchText = (text: string) => {
    if (!searchQuery || !searchQuery.trim()) {
      return text
    }

    // 정규식 특수문자 이스케이프
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'))

    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={index} className={styles.searchHighlight}>{part}</mark>
          ) : (
            part
          )
        )}
      </>
    )
  }

  // 메시지 내용 렌더링 (이미지, 상품 등)
  const renderMessageContent = (text: string) => {
    // 이미지 메시지 [이미지]URL
    if (text.startsWith('[이미지]')) {
      const imageUrl = text.substring(5).trim()
      if (imageUrl) {
        return (
          <div className={styles.imageMessage} onClick={() => setViewerImageUrl(imageUrl)}>
            <img src={imageUrl} alt="전송된 이미지" />
          </div>
        )
      }
    }

    // 상품 메시지 [상품]productId 또는 [상품]{JSON}
    if (text.startsWith('[상품]')) {
      const content = text.substring(4).trim()

      // 기존 JSON 형태 처리 (하위 호환성)
      if (content.startsWith('{')) {
        try {
          const product = JSON.parse(content)
          if (product.id) {
            return <ProductMessageCard productId={product.id} />
          }
        } catch (error) {
          console.error('[ChatRoom] JSON 파싱 실패:', error)
        }
      }

      // 새로운 형태: 상품 ID만 있는 경우
      if (content && !content.startsWith('{')) {
        return <ProductMessageCard productId={content} />
      }

      // 파싱 실패시 원본 텍스트 표시
      return <div className={styles.textMessage}>{text}</div>
    }

    // 일반 텍스트 메시지 (검색어 하이라이트 적용)
    return <div className={styles.textMessage}>{highlightSearchText(text)}</div>
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

    // 날짜별로 역순 정렬 (최신 날짜가 아래로)
    const sortedEntries = Object.entries(messagesByDate).reverse()

    return sortedEntries.map(([dateKey, msgs]) => (
      <div key={dateKey}>
        {/* 날짜 구분선을 메시지 아래에 표시 (역순이므로) */}
        {msgs.map((message) => {
          const isProductMessage = message.text.startsWith('[상품]')
          const isImageMessage = message.text.startsWith('[이미지]')
          return (
            <div
              key={message.id}
              id={`message-${message.id}`}
              className={`${styles.messageItem} ${
                message.senderId === user?.uid ? styles.myMessage : styles.otherMessage
              }`}
            >
              {message.senderId !== user?.uid && (
                <span className={styles.senderName}>{otherUserName || message.senderName}</span>
              )}
              <div className={styles.messageContent}>
                {isProductMessage || isImageMessage ? (
                  <>
                    {renderMessageContent(message.text)}
                    <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
                  </>
                ) : (
                  <>
                    <div className={styles.messageBubble}>
                      {renderMessageContent(message.text)}
                    </div>
                    <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
                  </>
                )}
              </div>
            </div>
          )
        })}
        <div className={styles.dateDivider}>
          {formatDate(msgs[0].timestamp)}
        </div>
      </div>
    ))
  }

  if (authLoading || loading) {
    return <div className={styles.loading}>채팅방을 불러오는 중...</div>
  }

  if (!room) {
    return <div className={styles.error}>채팅방을 찾을 수 없습니다.</div>
  }

  console.log('[ChatRoom] Render - showHeader:', showHeader)
  console.log('[ChatRoom] performSearch 타입:', typeof performSearch)

  return (
    <>
      {showHeader && (
        <ChatRoomHeader
          roomId={roomId}
          onSearch={performSearch}
          searchResultCount={searchResults.length}
          currentSearchIndex={currentResultIndex}
          onNextResult={() => {
            if (searchResults.length === 0) return
            const nextIndex = (currentResultIndex + 1) % searchResults.length
            setCurrentResultIndex(nextIndex)
            scrollToMessage(searchResults[nextIndex].id)
          }}
          onPrevResult={() => {
            if (searchResults.length === 0) return
            const prevIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1
            setCurrentResultIndex(prevIndex)
            scrollToMessage(searchResults[prevIndex].id)
          }}
        />
      )}
      <div className={styles.container}>
      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        {messages.length === 0 && uploadingImages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>메시지를 보내 대화를 시작해보세요!</p>
          </div>
        ) : (
          <>
            {renderMessages()}

            {/* 업로드 중인 이미지 표시 */}
            {uploadingImages.map((img) => (
              <div key={img.id} className={`${styles.messageItem} ${styles.myMessage}`}>
                <div className={styles.messageContent}>
                  <div className={styles.messageBubble}>
                    <div className={styles.uploadingImageWrapper}>
                      <img src={img.preview} alt="업로드 중" className={styles.uploadingImage} />
                      <div className={styles.uploadingOverlay}>
                        <div className={styles.spinner}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.inputContainer} onSubmit={handleSendMessage}>
        <button
          type="button"
          className={styles.attachButton}
          onClick={() => setShowAttachmentPopup(true)}
          disabled={isUploading}
          title="첨부"
        >
          +
        </button>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder={isUploading ? '업로드 중...' : '메시지를 입력하세요...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isUploading}
          style={{
            width: inputWidth > 0 ? `${inputWidth}px` : 'auto',
            maxWidth: inputWidth > 0 ? `${inputWidth}px` : '100%',
          }}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!inputText.trim() || isUploading}
        >
          <Image
            src={!inputText.trim() || isUploading ? "/icons/send.png" : "/icons/send_active.png"}
            alt="전송"
            width={24}
            height={24}
            unoptimized
          />
        </button>
      </form>

      {/* 첨부 팝업 */}
      {showAttachmentPopup && (
        <ChatMessageAttachment
          onImageSelect={handleImageSelect}
          onProductSelect={handleProductSelect}
          onClose={() => setShowAttachmentPopup(false)}
        />
      )}

      {/* 상품 선택 팝업 */}
      {showProductPopup && room && (
        <ProductSelectPopup
          storeId={room.storeId}
          onProductSelect={handleProductChosen}
          onClose={() => setShowProductPopup(false)}
        />
      )}

      {/* 이미지 확대 팝업 */}
      {viewerImageUrl && (
        <ImageViewerPopup
          imageUrl={viewerImageUrl}
          onClose={() => setViewerImageUrl(null)}
        />
      )}

      {/* 상품 문의 확인 모달 */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>이 상품에 대해서 문의할까요?</h3>

            {/* 상품 카드 표시 */}
            {pendingProduct && (
              <div className={styles.productMessage}>
                <div className={styles.productImage}>
                  {pendingProduct.images && pendingProduct.images.length > 0 ? (
                    <img src={pendingProduct.images[0]} alt={pendingProduct.name} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0' }} />
                  )}
                </div>
                <div className={styles.productInfo}>
                  <p className={styles.productName}>{pendingProduct.name}</p>
                  <p className={styles.productPrice}>
                    {pendingProduct.discountedPrice
                      ? `${pendingProduct.discountedPrice.toLocaleString('ko-KR')}원`
                      : `${pendingProduct.price.toLocaleString('ko-KR')}원`
                    }
                  </p>
                </div>
              </div>
            )}

            <div className={styles.modalButtons}>
              <button
                className={styles.cancelButton}
                onClick={handleCancelInquiry}
              >
                취소
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleConfirmInquiry}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </>
  )
})

ChatRoom.displayName = 'ChatRoom'

export default ChatRoom
