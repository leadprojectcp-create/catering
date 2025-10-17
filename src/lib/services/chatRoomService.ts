import { ref, update, push } from 'firebase/database'
import { doc, updateDoc, arrayRemove, getDoc } from 'firebase/firestore'
import { realtimeDb, db } from '@/lib/firebase'

/**
 * 채팅방 나가기 (논리적 삭제)
 * - 사용자의 chatRooms 배열에서 roomId 제거
 * - 상대방에게 시스템 메시지 전송
 */
export async function leaveChatRoom(
  userId: string,
  roomId: string
): Promise<void> {
  try {
    // 1. 사용자의 Firestore chatRooms 배열에서 roomId 제거
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      chatRooms: arrayRemove(roomId)
    })

    // 2. 사용자 이름 가져오기
    const userDoc = await getDoc(userRef)
    const userData = userDoc.data()
    let userName = '사용자'
    if (userData) {
      if (userData.type === 'partner') {
        userName = userData.companyName || userData.storeName || '파트너'
      } else {
        userName = userData.name || '사용자'
      }
    }

    // 3. 상대방에게 시스템 메시지 전송
    const messagesRef = ref(realtimeDb, `chatRooms/${roomId}/messages`)
    const newMessageRef = push(messagesRef)

    const systemMessage = {
      senderId: 'system',
      text: `${userName}님이 채팅방에서 나갔습니다.`,
      timestamp: Date.now(),
      type: 'system'
    }

    await update(newMessageRef, systemMessage)

    // 4. 채팅방의 lastMessage 업데이트
    const chatRoomRef = ref(realtimeDb, `chatRooms/${roomId}`)
    await update(chatRoomRef, {
      lastMessage: systemMessage.text,
      lastMessageTime: systemMessage.timestamp
    })

    console.log('[chatRoomService] 채팅방 나가기 성공:', roomId)
  } catch (error) {
    console.error('[chatRoomService] 채팅방 나가기 실패:', error)
    throw error
  }
}
