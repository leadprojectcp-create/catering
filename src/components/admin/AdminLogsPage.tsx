'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './AdminLogsPage.module.css'

interface LogEntry {
  id: string
  restaurantId: string
  restaurantName: string
  actionType: 'phone_call' | 'website_visit'
  timestamp: { toDate?: () => Date } | Date | string
  userAgent?: string
  ipAddress?: string
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'phone_call' | 'website_visit'>('all')
  const { user, userData } = useAuth()

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Check if user is authenticated and has admin level (level 10)
        if (!user || !userData) {
          setIsLoading(false)
          return
        }

        // Check if user has admin level (level 10)
        if (userData.level !== 10) {
          setIsLoading(false)
          return
        }

        const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'))
        const querySnapshot = await getDocs(q)
        const logData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LogEntry[]
        setLogs(logData)
      } catch (error) {
        console.error('로그 데이터 가져오기 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [user, userData])

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.actionType === filter)

  const formatTimestamp = (timestamp: { toDate?: () => Date } | Date | string) => {
    if (!timestamp) return '-'
    let date: Date
    if (typeof timestamp === 'object' && 'toDate' in timestamp && timestamp.toDate) {
      date = timestamp
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else {
      date = new Date()
    }
    return date.toLocaleString('ko-KR')
  }

  const getActionText = (actionType: string) => {
    switch (actionType) {
      case 'phone_call':
        return '전화하기'
      case 'website_visit':
        return '웹사이트 방문'
      default:
        return actionType
    }
  }

  const getActionBadgeClass = (actionType: string) => {
    switch (actionType) {
      case 'phone_call':
        return styles.badgePhone
      case 'website_visit':
        return styles.badgeWebsite
      default:
        return styles.badgeDefault
    }
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loading}>로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loading}>로그인이 필요합니다.</div>
        </div>
      </div>
    )
  }

  if (userData && userData.level !== 10) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loading}>관리자 권한이 필요합니다. (레벨 10 필요)</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>활동 로그 관리</h1>
          <p className={styles.description}>사용자의 전화하기 및 웹사이트 방문 활동을 확인할 수 있습니다.</p>
        </div>

        {/* 필터 버튼 */}
        <div className={styles.filterContainer}>
          <button
            onClick={() => setFilter('all')}
            className={`${styles.filterButton} ${
              filter === 'all' ? styles.filterButtonActive : styles.filterButtonInactive
            }`}
          >
            전체 ({logs.length})
          </button>
          <button
            onClick={() => setFilter('phone_call')}
            className={`${styles.filterButton} ${
              filter === 'phone_call' ? styles.filterButtonActive : styles.filterButtonInactive
            }`}
          >
            전화하기 ({logs.filter(log => log.actionType === 'phone_call').length})
          </button>
          <button
            onClick={() => setFilter('website_visit')}
            className={`${styles.filterButton} ${
              filter === 'website_visit' ? styles.filterButtonActive : styles.filterButtonInactive
            }`}
          >
            웹사이트 방문 ({logs.filter(log => log.actionType === 'website_visit').length})
          </button>
        </div>

        {/* 로그 테이블 */}
        <div className={styles.tableContainer}>
          {filteredLogs.length === 0 ? (
            <div className={styles.emptyState}>
              {filter === 'all' ? '활동 로그가 없습니다.' : `${getActionText(filter)} 로그가 없습니다.`}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead className={styles.tableHeader}>
                  <tr>
                    <th className={styles.tableHeaderCell}>시간</th>
                    <th className={styles.tableHeaderCell}>업체명</th>
                    <th className={styles.tableHeaderCell}>액션</th>
                    <th className={styles.tableHeaderCell}>사용자 정보</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.restaurantName}>
                          {log.restaurantName}
                        </div>
                        <div className={styles.restaurantId}>
                          ID: {log.restaurantId}
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={`${styles.badge} ${getActionBadgeClass(log.actionType)}`}>
                          {getActionText(log.actionType)}
                        </span>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.userInfo}>
                          {log.userAgent || '-'}
                        </div>
                        {log.ipAddress && (
                          <div className={styles.ipAddress}>
                            IP: {log.ipAddress}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 통계 요약 */}
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{logs.length}</div>
            <div className={styles.statLabel}>총 활동 수</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statNumber} ${styles.statNumberGreen}`}>
              {logs.filter(log => log.actionType === 'phone_call').length}
            </div>
            <div className={styles.statLabel}>전화하기 클릭</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statNumber} ${styles.statNumberBlue}`}>
              {logs.filter(log => log.actionType === 'website_visit').length}
            </div>
            <div className={styles.statLabel}>웹사이트 방문</div>
          </div>
        </div>
      </div>
    </div>
  )
}