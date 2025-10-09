import ChatRoom from '@/components/chat/ChatRoom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  return (
    <>
      <Header />
      <ChatRoom roomId={params.roomId} />
      <Footer />
    </>
  )
}
