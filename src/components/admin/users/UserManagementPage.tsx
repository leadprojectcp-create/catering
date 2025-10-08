'use client'

import { useState, useEffect } from 'react'
import { getAllUsers, updateUserType, toggleUserStatus } from '@/lib/services/userService'
import type { User } from '@/lib/services/userService'
import type { Timestamp, FieldValue } from 'firebase/firestore'
import Loading from '@/components/Loading'
import styles from './UserManagementPage.module.css'

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'partner' | 'user' | 'admin'>('all')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getAllUsers()
      setUsers(data)
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error)
      alert('사용자 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type?: 'partner' | 'user' | 'admin') => {
    switch (type) {
      case 'partner': return '파트너'
      case 'admin': return '관리자'
      case 'user':
      default: return '일반회원'
    }
  }

  const handleTypeChange = async (uid: string, newType: 'partner' | 'user' | 'admin') => {
    if (!confirm(`이 사용자의 유형을 ${getTypeLabel(newType)}로 변경하시겠습니까?`)) {
      return
    }

    try {
      await updateUserType(uid, newType)
      setUsers(users.map(u => u.uid === uid ? { ...u, type: newType } : u))
      alert('유형이 변경되었습니다.')
    } catch (error) {
      console.error('유형 변경 실패:', error)
      alert('유형 변경에 실패했습니다.')
    }
  }

  const handleToggleStatus = async (uid: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    if (!confirm(`이 사용자를 ${newStatus ? '비활성화' : '활성화'}하시겠습니까?`)) {
      return
    }

    try {
      await toggleUserStatus(uid, newStatus)
      setUsers(users.map(u => u.uid === uid ? { ...u, disabled: newStatus } : u))
      alert(`사용자가 ${newStatus ? '비활성화' : '활성화'}되었습니다.`)
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const formatDate = (date: Date | Timestamp | FieldValue | undefined) => {
    if (!date) return '-'
    const d = typeof date === 'object' && 'toDate' in date ? (date as Timestamp).toDate() : new Date(date as string | number | Date)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true
    return user.type === filter
  })

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>사용자 관리</h1>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 ({users.length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'partner' ? styles.active : ''}`}
            onClick={() => setFilter('partner')}
          >
            파트너 ({users.filter(u => u.type === 'partner').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'user' ? styles.active : ''}`}
            onClick={() => setFilter('user')}
          >
            일반회원 ({users.filter(u => u.type === 'user' || !u.type).length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'admin' ? styles.active : ''}`}
            onClick={() => setFilter('admin')}
          >
            관리자 ({users.filter(u => u.type === 'admin').length})
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>이메일</th>
              <th>이름</th>
              <th>전화번호</th>
              <th>역할</th>
              <th>가입일</th>
              <th>마지막 로그인</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  사용자가 없습니다.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.uid} className={user.disabled ? styles.disabled : ''}>
                  <td>{user.email}</td>
                  <td>{user.name || '-'}</td>
                  <td>{user.phone || '-'}</td>
                  <td>
                    <select
                      className={styles.roleSelect}
                      value={user.type || 'user'}
                      onChange={(e) => handleTypeChange(user.uid, e.target.value as 'partner' | 'user' | 'admin')}
                    >
                      <option value="user">일반회원</option>
                      <option value="partner">파트너</option>
                      <option value="admin">관리자</option>
                    </select>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>{formatDate(user.lastLoginAt)}</td>
                  <td>
                    <span className={`${styles.status} ${user.disabled ? styles.statusInactive : styles.statusActive}`}>
                      {user.disabled ? '비활성' : '활성'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.toggleBtn}
                      onClick={() => handleToggleStatus(user.uid, user.disabled || false)}
                    >
                      {user.disabled ? '활성화' : '비활성화'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
