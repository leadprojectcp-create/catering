import {
  ref,
  push,
  set,
  get,
  onValue,
  query,
  orderByChild,
  off,
  update
} from 'firebase/database'
import { doc, arrayUnion, getDoc, setDoc } from 'firebase/firestore'
import { realtimeDb, db } from '@/lib/firebase'

// 채팅 관련 타입 정의
export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
  read: boolean
}

export interface ChatRoom {
  id: string
  participants: string[] // [userId, storeOwnerId]
  storeId: string
  storeName: string
  lastMessage?: string
  lastMessageTime?: number
  createdAt: number
  unreadCount?: { [userId: string]: number } // 각 사용자별 읽지 않은 메시지 수
}

// 채팅방 생성 또는 기존 채팅방 가져오기
export const createOrGetChatRoom = async (
  userId: string,
  storeId: string,
  storeName: string,
  storeOwnerId: string
): Promise<string> => {
  try {
    // 기존 채팅방 확인
    const chatRoomsRef = ref(realtimeDb, 'chatRooms')
    const snapshot = await get(chatRoomsRef)

    if (snapshot.exists()) {
      const rooms = snapshot.val()
      // 동일한 사용자와 가게의 채팅방이 이미 있는지 확인
      for (const [roomId, room] of Object.entries(rooms as Record<string, ChatRoom>)) {
        if (
          room.storeId === storeId &&
          room.participants.includes(userId) &&
          room.participants.includes(storeOwnerId)
        ) {
          // 기존 채팅방이 있어도 양쪽 users에 chatRooms 배열 업데이트 (없으면 추가)
          const userRef = doc(db, 'users', userId)
          const storeOwnerRef = doc(db, 'users', storeOwnerId)

          try {
            await setDoc(userRef, {
              chatRooms: arrayUnion(roomId)
            }, { merge: true })
          } catch (error) {
            console.error('기존 채팅방 - 사용자 chatRooms 업데이트 실패:', userId, error)
          }

          try {
            await setDoc(storeOwnerRef, {
              chatRooms: arrayUnion(roomId)
            }, { merge: true })
          } catch (error) {
            console.error('기존 채팅방 - 파트너 chatRooms 업데이트 실패:', storeOwnerId, error)
          }

          return roomId
        }
      }
    }

    // 새 채팅방 생성
    const newRoomRef = push(chatRoomsRef)
    const roomId = newRoomRef.key!

    const newRoom: Omit<ChatRoom, 'id'> = {
      participants: [userId, storeOwnerId],
      storeId,
      storeName,
      createdAt: Date.now()
    }

    await set(newRoomRef, newRoom)

    // 각 사용자의 Firestore users 컬렉션에 chatRooms 배열 추가
    const userRef = doc(db, 'users', userId)
    const storeOwnerRef = doc(db, 'users', storeOwnerId)

    console.log('chatRooms 업데이트 시작:', { userId, storeOwnerId, roomId })

    try {
      // 현재 사용자의 chatRooms 업데이트
      await setDoc(userRef, {
        chatRooms: arrayUnion(roomId)
      }, { merge: true })
      console.log('현재 사용자 chatRooms 업데이트 성공:', userId)
    } catch (error) {
      console.error('현재 사용자 chatRooms 업데이트 실패:', userId, error)
    }

    try {
      // 상대방의 chatRooms 업데이트
      await setDoc(storeOwnerRef, {
        chatRooms: arrayUnion(roomId)
      }, { merge: true })
      console.log('상대방 chatRooms 업데이트 성공:', storeOwnerId)
    } catch (error) {
      console.error('상대방 chatRooms 업데이트 실패:', storeOwnerId, error)
    }

    return roomId
  } catch (error) {
    console.error('채팅방 생성 실패:', error)
    throw error
  }
}

// 채팅방 정보 가져오기
export const getChatRoom = async (roomId: string): Promise<ChatRoom | null> => {
  try {
    const roomRef = ref(realtimeDb, `chatRooms/${roomId}`)
    const snapshot = await get(roomRef)

    if (snapshot.exists()) {
      return {
        id: roomId,
        ...snapshot.val()
      } as ChatRoom
    }

    return null
  } catch (error) {
    console.error('채팅방 정보 가져오기 실패:', error)
    throw error
  }
}

// 사용자의 채팅방 목록 가져오기
export const getUserChatRooms = async (userId: string): Promise<ChatRoom[]> => {
  try {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return []
    }

    const userData = userDoc.data()
    const chatRoomIds = userData.chatRooms || []

    if (chatRoomIds.length === 0) {
      return []
    }

    // 각 채팅방 정보 가져오기
    const chatRooms = await Promise.all(
      chatRoomIds.map(async (roomId: string) => {
        const room = await getChatRoom(roomId)
        return room
      })
    )

    // null이 아닌 채팅방만 필터링하고 최근 메시지 순으로 정렬
    return chatRooms
      .filter((room): room is ChatRoom => room !== null)
      .sort((a, b) => (b.lastMessageTime || b.createdAt) - (a.lastMessageTime || a.createdAt))
  } catch (error) {
    console.error('채팅방 목록 가져오기 실패:', error)
    throw error
  }
}

// 메시지 전송
export const sendMessage = async (
  roomId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> => {
  try {
    const messagesRef = ref(realtimeDb, `messages/${roomId}`)
    const newMessageRef = push(messagesRef)

    const message: Omit<ChatMessage, 'id'> = {
      senderId,
      senderName,
      text,
      timestamp: Date.now(),
      read: false
    }

    await set(newMessageRef, message)

    // 채팅방 정보 가져오기
    const roomRef = ref(realtimeDb, `chatRooms/${roomId}`)
    const roomSnapshot = await get(roomRef)

    if (roomSnapshot.exists()) {
      const roomData = roomSnapshot.val() as ChatRoom
      const participants = roomData.participants || []
      const unreadCount = roomData.unreadCount || {}

      // 상대방의 unreadCount 증가
      participants.forEach((participantId) => {
        if (participantId !== senderId) {
          unreadCount[participantId] = (unreadCount[participantId] || 0) + 1
        }
      })

      // 채팅방의 마지막 메시지 및 unreadCount 업데이트
      await update(roomRef, {
        lastMessage: text,
        lastMessageTime: Date.now(),
        unreadCount
      })
    }
  } catch (error) {
    console.error('메시지 전송 실패:', error)
    throw error
  }
}

// 메시지 실시간 구독
export const subscribeToMessages = (
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const messagesRef = ref(realtimeDb, `messages/${roomId}`)
  const messagesQuery = query(messagesRef, orderByChild('timestamp'))

  const unsubscribe = onValue(messagesQuery, (snapshot) => {
    const messages: ChatMessage[] = []

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key!,
          ...childSnapshot.val()
        } as ChatMessage)
      })
    }

    callback(messages)
  })

  // 구독 해제 함수 반환
  return () => off(messagesRef, 'value', unsubscribe)
}

// 메시지 읽음 처리
export const markMessagesAsRead = async (
  roomId: string,
  userId: string
): Promise<void> => {
  try {
    const messagesRef = ref(realtimeDb, `messages/${roomId}`)
    const snapshot = await get(messagesRef)

    if (snapshot.exists()) {
      const updates: Record<string, boolean> = {}

      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val() as ChatMessage
        // 다른 사용자가 보낸 읽지 않은 메시지만 업데이트
        if (message.senderId !== userId && !message.read) {
          updates[`${childSnapshot.key}/read`] = true
        }
      })

      if (Object.keys(updates).length > 0) {
        await update(messagesRef, updates)
      }
    }

    // 채팅방의 내 unreadCount를 0으로 리셋
    const roomRef = ref(realtimeDb, `chatRooms/${roomId}`)
    const roomSnapshot = await get(roomRef)

    if (roomSnapshot.exists()) {
      const roomData = roomSnapshot.val() as ChatRoom
      const unreadCount = roomData.unreadCount || {}

      console.log('[markMessagesAsRead] 이전 unreadCount:', unreadCount)
      unreadCount[userId] = 0
      console.log('[markMessagesAsRead] 업데이트 후 unreadCount:', unreadCount)

      await update(roomRef, { unreadCount })
      console.log('[markMessagesAsRead] DB 업데이트 완료')
    }
  } catch (error) {
    console.error('메시지 읽음 처리 실패:', error)
    throw error
  }
}

// 읽지 않은 메시지 개수 가져오기 (DB에서 직접 읽음)
export const getUnreadMessageCount = async (roomId: string, userId: string): Promise<number> => {
  try {
    const roomRef = ref(realtimeDb, `chatRooms/${roomId}`)
    const snapshot = await get(roomRef)

    if (snapshot.exists()) {
      const roomData = snapshot.val() as ChatRoom
      return roomData.unreadCount?.[userId] || 0
    }

    return 0
  } catch (error) {
    console.error('읽지 않은 메시지 개수 가져오기 실패:', error)
    return 0
  }
}

// 전체 읽지 않은 메시지 개수 가져오기
export const getTotalUnreadCount = async (userId: string): Promise<number> => {
  try {
    const chatRooms = await getUserChatRooms(userId)
    let totalUnread = 0

    for (const room of chatRooms) {
      const unreadCount = await getUnreadMessageCount(room.id, userId)
      totalUnread += unreadCount
    }

    return totalUnread
  } catch (error) {
    console.error('전체 읽지 않은 메시지 개수 가져오기 실패:', error)
    return 0
  }
}

// 읽지 않은 메시지 개수 실시간 구독 (모든 채팅방을 한 번에 구독)
export const subscribeToUnreadCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  console.log('[subscribeToUnreadCount] 구독 시작:', userId)

  // 모든 채팅방의 unreadCount 변경사항 구독
  const chatRoomsRef = ref(realtimeDb, 'chatRooms')

  const unsubscribe = onValue(chatRoomsRef, async (snapshot) => {
    try {
      console.log('[subscribeToUnreadCount] 데이터 변경 감지:', {
        exists: snapshot.exists(),
        userId
      })

      if (!snapshot.exists()) {
        console.log('[subscribeToUnreadCount] 채팅방 데이터 없음')
        callback(0)
        return
      }

      let totalUnread = 0
      const roomDetails: Array<{
        roomId: string | null
        participants: string[]
        unreadCountData: { [userId: string]: number } | undefined
        myUnreadCount: number
      }> = []

      snapshot.forEach((childSnapshot) => {
        const room = childSnapshot.val() as ChatRoom
        const roomId = childSnapshot.key
        const unreadCount = room.unreadCount?.[userId] || 0
        totalUnread += unreadCount

        roomDetails.push({
          roomId,
          participants: room.participants,
          unreadCountData: room.unreadCount,
          myUnreadCount: unreadCount
        })
      })

      console.log('[subscribeToUnreadCount] 채팅방 상세:', roomDetails)
      console.log('[subscribeToUnreadCount] 전체 읽지 않은 메시지:', totalUnread)
      callback(totalUnread)
    } catch (error) {
      console.error('읽지 않은 메시지 계산 실패:', error)
      callback(0)
    }
  })

  // 구독 해제 함수 반환
  return () => {
    console.log('[subscribeToUnreadCount] 구독 해제:', userId)
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    }
  }
}
