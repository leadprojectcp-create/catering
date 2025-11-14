import { collection, addDoc, FieldValue, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ReportData {
  reporterUid: string        // 신고자 UID
  reportedUid: string         // 신고 대상자 UID
  chatRoomId: string          // 채팅방 ID
  reason: string              // 신고 유형
  details: string             // 신고 상세 내용
  status: 'pending' | 'reviewed' | 'resolved' // 처리 상태
  createdAt: Timestamp        // 생성 시간
}

/**
 * 채팅방 신고 생성
 */
export async function createReport(
  reporterUid: string,
  reportedUid: string,
  chatRoomId: string,
  reason: string,
  details: string
): Promise<string> {
  try {
    const reportData = {
      reporterUid,
      reportedUid,
      chatRoomId,
      reason,
      details,
      status: 'pending',
      createdAt: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, 'reports'), reportData)
    console.log('[reportService] 신고 생성 성공:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('[reportService] 신고 생성 실패:', error)
    throw error
  }
}
