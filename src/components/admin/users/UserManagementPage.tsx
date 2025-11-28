'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Timestamp } from 'firebase/firestore'
import { getAllUsers, updateUserType, toggleUserStatus } from '@/lib/services/userService'
import type { User } from '@/lib/services/userService'
import type { FieldValue } from 'firebase/firestore'
import Loading from '@/components/Loading'
import CouponIssueModal from './CouponIssueModal'
import styles from './UserManagementPage.module.css'

// SWR fetcher 함수
const fetchUsers = async (): Promise<User[]> => {
  return await getAllUsers()
}

export default function UserManagementPage() {
  const [filter, setFilter] = useState<'all' | 'partner' | 'user' | 'admin'>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)

  // SWR로 사용자 데이터 관리
  const { data: users = [], error, isLoading, mutate } = useSWR<User[]>(
    'admin-users',
    fetchUsers,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

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
      // SWR 캐시 업데이트
      mutate(
        (prev) => prev?.map(u => u.uid === uid ? { ...u, type: newType } : u),
        false
      )
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
      // SWR 캐시 업데이트
      mutate(
        (prev) => prev?.map(u => u.uid === uid ? { ...u, disabled: newStatus } : u),
        false
      )
      alert(`사용자가 ${newStatus ? '비활성화' : '활성화'}되었습니다.`)
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const formatDate = (date: Date | Timestamp | FieldValue | undefined) => {
    if (!date) return '-'
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    return '-'
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('UID가 복사되었습니다.')
    } catch (error) {
      console.error('복사 실패:', error)
      alert('복사에 실패했습니다.')
    }
  }

  // 체크박스 관련 함수들
  const handleSelectUser = (uid: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(uid)) {
      newSelected.delete(uid)
    } else {
      newSelected.add(uid)
    }
    setSelectedUserIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.uid)))
    }
  }

  const getSelectedUsers = () => {
    return users.filter(u => selectedUserIds.has(u.uid))
  }

  const handleCouponIssueSuccess = () => {
    setSelectedUserIds(new Set())
  }

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true
    return user.type === filter
  })

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>사용자 관리</h1>
        <div className={styles.headerActions}>
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
          {selectedUserIds.size > 0 && (
            <button
              className={styles.couponBtn}
              onClick={() => setIsCouponModalOpen(true)}
            >
              선택한 {selectedUserIds.size}명에게 쿠폰 발급
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCol}>
                <input
                  type="checkbox"
                  checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                  onChange={handleSelectAll}
                  className={styles.checkbox}
                />
              </th>
              <th>이메일</th>
              <th>UID</th>
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
                <td colSpan={10} className={styles.empty}>
                  사용자가 없습니다.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.uid} className={`${user.disabled ? styles.disabled : ''} ${selectedUserIds.has(user.uid) ? styles.selected : ''}`}>
                  <td className={styles.checkboxCol}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(user.uid)}
                      onChange={() => handleSelectUser(user.uid)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td>{user.email}</td>
                  <td className={styles.uidCell}>
                    <span className={styles.uid}>{user.uid}</span>
                    <button
                      className={styles.copyBtn}
                      onClick={() => copyToClipboard(user.uid)}
                      title="UID 복사"
                    >
                      복사
                    </button>
                  </td>
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

      <CouponIssueModal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        selectedUsers={getSelectedUsers()}
        onSuccess={handleCouponIssueSuccess}
      />
    </div>
  )
}
