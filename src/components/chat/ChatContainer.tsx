'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getUserChatRooms, ChatRoom as ChatRoomType, createOrGetChatRoom } from '@/lib/services/chatService'
import { ref, onValue } from 'firebase/database'
import { realtimeDb } from '@/lib/firebase'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getProduct } from '@/lib/services/productService'
import ChatRoom, { ChatRoomRef } from './ChatRoom'
import ChatRoomHeader from './ChatRoomHeader'
import Header from '@/components/Header'
import PartnerHeader from '@/components/partner/PartnerHeader'
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
  const [initialProductId, setInitialProductId] = useState<string | null>(null)
  const [initialMessage, setInitialMessage] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const chatRoomRef = useRef<ChatRoomRef>(null)
  const [searchResultCount, setSearchResultCount] = useState(0)
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const hasProcessedProductId = useRef(false)

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Firestore users 컬렉션의 chatRooms 배열을 실시간으로 구독하여 채팅방 목록 업데이트
  useEffect(() => {
    // 인증 로딩 중이면 아무것도 하지 않음
    if (authLoading) return

    // 인증 완료 후 유저가 없으면 로그인 페이지로
    if (!user) {
      router.push('/login')
      return
    }

    console.log('[ChatContainer] users chatRooms 구독 시작')

    // Firestore users 문서의 chatRooms 배열 실시간 구독
    const userRef = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data()
        const chatRoomIds = userData.chatRooms || []

        console.log('[ChatContainer] chatRooms 배열 변경 감지:', chatRoomIds)

        // chatRoomIds가 변경되면 채팅방 목록 다시 로드
        loadChatRooms()
      }
    }, (error) => {
      console.error('[ChatContainer] users chatRooms 구독 실패:', error)
    })

    return () => {
      console.log('[ChatContainer] users chatRooms 구독 해제')
      unsubscribe()
    }
  }, [user, authLoading, router])

  // URL의 roomId, productId, message 파라미터 처리
  useEffect(() => {
    const roomId = searchParams.get('roomId')
    const productId = searchParams.get('productId')
    const message = searchParams.get('message')

    // roomId가 있으면 선택, 없으면 초기화
    if (roomId) {
      setSelectedRoomId(roomId)
      // roomId가 있으면 productId 처리 플래그 리셋하지 않음
    } else {
      setSelectedRoomId(null)
    }

    // productId가 있고, 아직 처리하지 않았으면 채팅방 찾기/생성
    if (productId && user && !hasProcessedProductId.current) {
      hasProcessedProductId.current = true
      findOrCreateChatRoom(productId)
    }

    // productId와 message가 있으면 상태에 저장
    if (productId) {
      setInitialProductId(productId)
      console.log('[ChatContainer] productId:', productId)
    }
    if (message) {
      setInitialMessage(message)
      console.log('[ChatContainer] message:', message)
    }
  }, [searchParams, user])

  // 실시간으로 전체 chatRooms의 unreadCount, lastMessage, lastMessageTime 구독
  useEffect(() => {
    if (!user) return

    console.log('[ChatContainer] chatRooms 전체 구독 시작')

    const chatRoomsRef = ref(realtimeDb, 'chatRooms')
    const unsubscribe = onValue(chatRoomsRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('[ChatContainer] chatRooms 데이터 없음')
        return
      }

      console.log('[ChatContainer] chatRooms 데이터 변경 감지')

      // 현재 chatRooms 상태와 비교하여 unreadCount, lastMessage, lastMessageTime 업데이트
      setChatRooms(prevRooms => {
        const updatedRooms = prevRooms.map(room => {
          const roomSnapshot = snapshot.child(room.id)
          if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.val()
            const unreadCount = roomData.unreadCount?.[user.uid] || 0
            const lastMessage = roomData.lastMessage
            const lastMessageTime = roomData.lastMessageTime

            console.log(`[ChatContainer] 채팅방 ${room.id} 실시간 데이터:`, {
              unreadCount,
              lastMessage,
              lastMessageTime
            })

            // 항상 최신 데이터로 업데이트
            return {
              ...room,
              unreadCount,
              lastMessage: lastMessage || room.lastMessage,
              lastMessageTime: lastMessageTime || room.lastMessageTime
            }
          }
          return room
        })

        // lastMessageTime 기준으로 정렬 (최신순)
        return updatedRooms.sort((a, b) =>
          (b.lastMessageTime || b.createdAt) - (a.lastMessageTime || a.createdAt)
        )
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

          // 읽지 않은 메시지 개수 가져오기 (DB에서 직접)
          const roomData = room as ChatRoomType & { unreadCount?: { [key: string]: number } }
          const unreadCount = roomData.unreadCount?.[user.uid] || 0

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

  const findOrCreateChatRoom = async (productId: string) => {
    if (!user) return

    console.log('[ChatContainer] findOrCreateChatRoom 시작:', productId)

    try {
      // 상품 정보 가져오기
      const product = await getProduct(productId)
      if (!product) {
        console.error('[ChatContainer] 상품을 찾을 수 없습니다:', productId)
        return
      }

      // 상품의 가게 주인 ID 가져오기
      const storeOwnerId = product.partnerId
      if (!storeOwnerId) {
        console.error('[ChatContainer] 가게 주인 ID를 찾을 수 없습니다')
        return
      }

      console.log('[ChatContainer] 가게 주인 ID:', storeOwnerId)

      // 가게 주인 정보 가져오기 (storeName)
      let storeName = '가게'
      try {
        const storeOwnerDoc = await getDoc(doc(db, 'users', storeOwnerId))
        if (storeOwnerDoc.exists()) {
          const storeOwnerData = storeOwnerDoc.data()
          storeName = storeOwnerData.companyName || storeOwnerData.storeName || '가게'
        }
      } catch (error) {
        console.error('[ChatContainer] 가게 주인 정보 로드 실패:', error)
      }

      // 채팅방 찾기 또는 생성
      const roomId = await createOrGetChatRoom(user.uid, product.storeId || storeOwnerId, storeName, storeOwnerId)
      console.log('[ChatContainer] 채팅방 ID:', roomId)

      // 채팅방 목록 다시 로드
      await loadChatRooms()

      // 채팅방 선택
      setSelectedRoomId(roomId)

      // URL 업데이트 (productId와 message 유지)
      const message = searchParams.get('message')
      const params = new URLSearchParams()
      params.set('roomId', roomId)
      params.set('productId', productId)
      if (message) {
        params.set('message', message)
      }
      router.push(`/chat?${params.toString()}`, { scroll: false })
    } catch (error) {
      console.error('[ChatContainer] 채팅방 찾기/생성 실패:', error)
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

  const formatLastMessage = (text: string) => {
    if (text.startsWith('[이미지]')) {
      return '이미지'
    }
    if (text.startsWith('[상품]')) {
      return '상품'
    }
    return text
  }

  // 검색 결과 변경 핸들러
  const handleSearchResultsChange = (count: number, currentIndex: number) => {
    console.log('[ChatContainer] 검색 결과 변경:', { count, currentIndex })
    setSearchResultCount(count)
    setCurrentSearchIndex(currentIndex)
  }

  // 검색 핸들러
  const handleSearch = (query: string) => {
    console.log('[ChatContainer] handleSearch 호출:', query)
    if (chatRoomRef.current) {
      chatRoomRef.current.search(query)
    }
  }

  const handleNextResult = () => {
    console.log('[ChatContainer] handleNextResult 호출')
    if (chatRoomRef.current) {
      chatRoomRef.current.nextResult()
    }
  }

  const handlePrevResult = () => {
    console.log('[ChatContainer] handlePrevResult 호출')
    if (chatRoomRef.current) {
      chatRoomRef.current.prevResult()
    }
  }

  if (authLoading) {
    return null
  }

  return (
    <>
      {/* 모바일 채팅룸에서는 ChatRoomHeader, 그 외에는 기본 헤더 표시 안함 (page.tsx에서 렌더링) */}
      {isMobile && selectedRoomId && (
        <ChatRoomHeader
          roomId={selectedRoomId}
          showFullHeader={true}
          onSearch={handleSearch}
          searchResultCount={searchResultCount}
          currentSearchIndex={currentSearchIndex}
          onNextResult={handleNextResult}
          onPrevResult={handlePrevResult}
        />
      )}

      <div className={styles.container}>
        {/* 왼쪽: 채팅방 목록 */}
        <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.title}>채팅목록</h1>
        </div>

        {chatRooms.length === 0 ? (
          <div className={styles.emptyRooms}>
            <p>아직 채팅방이 없습니다.</p>
            <p>{isPartner ? '고객이 문의하면 채팅방이 생성됩니다.' : '가게에 문의하여 채팅을 시작해보세요!'}</p>
          </div>
        ) : (
          <div className={styles.roomList}>
            {chatRooms.map((room, index) => (
              <div key={room.id}>
                <div
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
                      <p className={styles.lastMessage}>{formatLastMessage(room.lastMessage)}</p>
                    )}
                  </div>
                  {room.lastMessageTime && (
                    <span className={styles.time}>
                      {formatTime(room.lastMessageTime)}
                    </span>
                  )}
                </div>
                {index < chatRooms.length - 1 && (
                  <div className={styles.divider}></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 오른쪽: 채팅방 상세 */}
      <div className={`${styles.mainContent} ${selectedRoomId ? styles.active : ''}`}>
        {selectedRoomId ? (
          <>
            {/* PC에서만 간단한 채팅방 헤더 표시 */}
            {!isMobile && (
              <div className={styles.chatRoomHeaderWrapper}>
                <ChatRoomHeader
                  roomId={selectedRoomId}
                  showFullHeader={false}
                  onSearch={handleSearch}
                  searchResultCount={searchResultCount}
                  currentSearchIndex={currentSearchIndex}
                  onNextResult={handleNextResult}
                  onPrevResult={handlePrevResult}
                />
              </div>
            )}
            <ChatRoom
              ref={chatRoomRef}
              roomId={selectedRoomId}
              onBack={() => {
                setSelectedRoomId(null)
              }}
              isPartner={isPartner}
              initialProductId={initialProductId}
              initialMessage={initialMessage}
              onSearchResultsChange={handleSearchResultsChange}
            />
          </>
        ) : (
          <div className={styles.emptyChat}>
            <p>채팅방을 선택해주세요</p>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
