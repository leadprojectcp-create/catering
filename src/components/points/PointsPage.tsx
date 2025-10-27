'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import styles from './PointsPage.module.css'

interface PointHistory {
  id: string
  type: 'earn' | 'use'
  amount: number
  description: string
  createdAt: Timestamp
  balance: number
}

export default function PointsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      try {
        // 포인트 내역 조회
        const pointsRef = collection(db, 'users', user.uid, 'pointHistory')
        const q = query(pointsRef, orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)

        const history: PointHistory[] = []
        snapshot.forEach((doc) => {
          history.push({
            id: doc.id,
            ...doc.data(),
          } as PointHistory)
        })

        setPointHistory(history)
        if (history.length > 0) {
          setCurrentBalance(history[0].balance)
        }
      } catch (error) {
        console.error('포인트 내역 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>포인트</h1>
      </div>

      <div className={styles.balanceCard}>
        <div className={styles.balanceLabel}>보유 포인트</div>
        <div className={styles.balanceAmount}>{currentBalance.toLocaleString()}P</div>
      </div>

      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>포인트 내역</h2>
        {pointHistory.length === 0 ? (
          <div className={styles.emptyState}>포인트 내역이 없습니다</div>
        ) : (
          <div className={styles.historyList}>
            {pointHistory.map((item) => (
              <div key={item.id} className={styles.historyItem}>
                <div className={styles.historyLeft}>
                  <div className={styles.historyDescription}>{item.description}</div>
                  <div className={styles.historyDate}>
                    {formatDate(item.createdAt)} {formatTime(item.createdAt)}
                  </div>
                </div>
                <div className={styles.historyRight}>
                  <div
                    className={`${styles.historyAmount} ${
                      item.type === 'earn' ? styles.earn : styles.use
                    }`}
                  >
                    {item.type === 'earn' ? '+' : '-'}
                    {item.amount.toLocaleString()}P
                  </div>
                  <div className={styles.historyBalance}>{item.balance.toLocaleString()}P</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
