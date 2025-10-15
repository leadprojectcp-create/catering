import ChatRoom from '@/components/chat/ChatRoom'
import Header from '@/components/Header'

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  return (
    <>
      <Header />
      <ChatRoom roomId={roomId} />
    </>
  )
}
