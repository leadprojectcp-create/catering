'use client'

import ChatRoom from '@/components/chat/ChatRoom'
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
      <ChatRoom roomId={roomId} showHeader={true} />
      <Footer />
    </>
  )
}
