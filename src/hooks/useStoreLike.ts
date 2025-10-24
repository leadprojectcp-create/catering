import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toggleStoreLike, checkUserLiked } from '@/lib/services/storeService'
import { useAuth } from '@/contexts/AuthContext'

interface UseStoreLikeProps {
  storeId: string
  storeName: string
  storeImage?: string
  initialLikeCount?: number
}

export function useStoreLike({
  storeId,
  storeName,
  storeImage,
  initialLikeCount = 0
}: UseStoreLikeProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikeCount)

  // 사용자가 로그인했으면 좋아요 상태 확인
  useEffect(() => {
    if (user) {
      checkUserLiked(user.uid, storeId).then(setIsLiked)
    }
  }, [user, storeId])

  const handleLikeToggle = async () => {
    // 로그인 체크
    if (!user) {
      alert('로그인이 필요한 기능입니다.')
      router.push('/auth/login')
      return
    }

    try {
      const prevLikedState = isLiked

      // 낙관적 업데이트
      setIsLiked(!isLiked)
      setLikeCount(prev => !isLiked ? prev + 1 : prev - 1)

      // DB 업데이트
      const newLikedState = await toggleStoreLike(
        user.uid,
        storeId,
        storeName,
        storeImage
      )

      // DB 결과로 상태 동기화
      setIsLiked(newLikedState)
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
      // 실패 시 원래 상태로 롤백
      setIsLiked(isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
      alert('좋아요 처리에 실패했습니다.')
    }
  }

  return {
    isLiked,
    likeCount,
    setLikeCount,
    handleLikeToggle
  }
}
