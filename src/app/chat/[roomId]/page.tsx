import ChatRoom from '@/components/chat/ChatRoom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

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
      <Footer />
    </>
  )
}
