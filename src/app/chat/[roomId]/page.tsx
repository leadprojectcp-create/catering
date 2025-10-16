'use client'

import ChatRoom from '@/components/chat/ChatRoom'
import ChatRoomHeader from '@/components/chat/ChatRoomHeader'
import Footer from '@/components/Footer'
import { use } from 'react'

export default function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = use(params)
  return (
    <>
      <ChatRoomHeader roomId={roomId} />
      <ChatRoom roomId={roomId} />
      <Footer />
    </>
  )
}
