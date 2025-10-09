import { redirect } from 'next/navigation'

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  // roomId가 있으면 메인 채팅 페이지로 리다이렉트 (쿼리 파라미터로 전달)
  redirect(`/chat?roomId=${params.roomId}`)
}
