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
import { doc, updateDoc, arrayUnion, getDoc, setDoc } from 'firebase/firestore'
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

    // 채팅방의 마지막 메시지 업데이트
    const roomRef = ref(realtimeDb, `chatRooms/${roomId}`)
    await update(roomRef, {
      lastMessage: text,
      lastMessageTime: Date.now()
    })
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
  } catch (error) {
    console.error('메시지 읽음 처리 실패:', error)
    throw error
  }
}

// 읽지 않은 메시지 개수 가져오기
export const getUnreadMessageCount = async (roomId: string, userId: string): Promise<number> => {
  try {
    const messagesRef = ref(realtimeDb, `messages/${roomId}`)
    const snapshot = await get(messagesRef)

    let unreadCount = 0

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val() as ChatMessage
        // 다른 사용자가 보낸 읽지 않은 메시지만 카운트
        if (message.senderId !== userId && !message.read) {
          unreadCount++
        }
      })
    }

    return unreadCount
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

// 읽지 않은 메시지 개수 실시간 구독
export const subscribeToUnreadCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  let unsubscribeFunctions: (() => void)[] = []

  const setupSubscription = async () => {
    try {
      const chatRooms = await getUserChatRooms(userId)
      const unreadCounts = new Map<string, number>()

      // 각 채팅방의 메시지 변경 구독
      const unsubscribes = chatRooms.map(room => {
        const messagesRef = ref(realtimeDb, `messages/${room.id}`)

        return onValue(messagesRef, (snapshot) => {
          let unreadCount = 0

          if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
              const message = childSnapshot.val() as ChatMessage
              if (message.senderId !== userId && !message.read) {
                unreadCount++
              }
            })
          }

          unreadCounts.set(room.id, unreadCount)

          // 전체 읽지 않은 메시지 수 계산
          const totalUnread = Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0)
          callback(totalUnread)
        })
      })

      unsubscribeFunctions = unsubscribes
    } catch (error) {
      console.error('읽지 않은 메시지 구독 실패:', error)
    }
  }

  setupSubscription()

  // 구독 해제 함수 반환
  return () => {
    unsubscribeFunctions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    })
  }
}
