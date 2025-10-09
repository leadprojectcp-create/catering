import { Suspense } from 'react'
import ChatContainer from '@/components/chat/ChatContainer'
import Header from '@/components/Header'

export default function ChatPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<div>Loading...</div>}>
        <ChatContainer />
      </Suspense>
    </>
  )
}
