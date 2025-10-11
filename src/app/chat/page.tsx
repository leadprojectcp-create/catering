'use client'

import { Suspense } from 'react'
import ChatContainer from '@/components/chat/ChatContainer'
import Header from '@/components/Header'
import PartnerHeader from '@/components/partner/PartnerHeader'
import Loading from '@/components/Loading'
import { useAuth } from '@/contexts/AuthContext'

export default function ChatPage() {
  const { userData } = useAuth()
  const isPartner = userData?.type === 'partner'

  return (
    <>
      {isPartner ? <PartnerHeader /> : <Header />}
      <Suspense fallback={<Loading />}>
        <ChatContainer isPartner={isPartner} />
      </Suspense>
    </>
  )
}
