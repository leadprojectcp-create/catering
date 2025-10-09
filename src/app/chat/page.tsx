import { Suspense } from 'react'
import ChatContainer from '@/components/chat/ChatContainer'
import Header from '@/components/Header'
import Loading from '@/components/Loading'

export default function ChatPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<Loading />}>
        <ChatContainer />
      </Suspense>
    </>
  )
}
