'use client'

import { useState, useEffect } from 'react'
import { getActiveCouponTemplates, issueCouponToUsers } from '@/lib/services/couponService'
import type { CouponTemplate } from '@/lib/services/couponService'
import styles from './CouponIssueModal.module.css'

interface User {
  uid: string
  name?: string
  email?: string
}

interface CouponIssueModalProps {
  isOpen: boolean
  onClose: () => void
  selectedUsers: User[]
  onSuccess: () => void
}

export default function CouponIssueModal({
  isOpen,
  onClose,
  selectedUsers,
  onSuccess
}: CouponIssueModalProps) {
  const [coupons, setCoupons] = useState<CouponTemplate[]>([])
  const [selectedCouponId, setSelectedCouponId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingCoupons, setLoadingCoupons] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadCoupons()
    }
  }, [isOpen])

  const loadCoupons = async () => {
    try {
      setLoadingCoupons(true)
      const data = await getActiveCouponTemplates()
      setCoupons(data)
      if (data.length > 0) {
        setSelectedCouponId(data[0].id!)
      }
    } catch (error) {
      console.error('쿠폰 목록 로드 실패:', error)
      alert('쿠폰 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoadingCoupons(false)
    }
  }

  const handleIssue = async () => {
    if (!selectedCouponId) {
      alert('발급할 쿠폰을 선택해주세요.')
      return
    }

    const selectedCoupon = coupons.find(c => c.id === selectedCouponId)
    if (!selectedCoupon) {
      alert('선택한 쿠폰을 찾을 수 없습니다.')
      return
    }

    if (!confirm(`${selectedUsers.length}명의 유저에게 "${selectedCoupon.name}" 쿠폰을 발급하시겠습니까?`)) {
      return
    }

    try {
      setLoading(true)
      const count = await issueCouponToUsers(
        selectedCoupon,
        selectedUsers.map(u => ({
          uid: u.uid,
          name: u.name,
          email: u.email
        }))
      )

      alert(`${count}명에게 쿠폰이 발급되었습니다.`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('쿠폰 발급 실패:', error)
      alert('쿠폰 발급에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const selectedCoupon = coupons.find(c => c.id === selectedCouponId)

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>쿠폰 발급</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.selectedUsers}>
            <span className={styles.label}>선택된 유저</span>
            <span className={styles.userCount}>{selectedUsers.length}명</span>
          </div>

          <div className={styles.userList}>
            {selectedUsers.slice(0, 5).map(user => (
              <div key={user.uid} className={styles.userItem}>
                <span className={styles.userName}>{user.name || '이름 없음'}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
            ))}
            {selectedUsers.length > 5 && (
              <div className={styles.moreUsers}>
                외 {selectedUsers.length - 5}명
              </div>
            )}
          </div>

          <div className={styles.couponSelect}>
            <label className={styles.label}>발급할 쿠폰 선택</label>
            {loadingCoupons ? (
              <div className={styles.loadingText}>쿠폰 목록 불러오는 중...</div>
            ) : coupons.length === 0 ? (
              <div className={styles.noCoupons}>
                <p>활성화된 쿠폰 템플릿이 없습니다.</p>
                <a href="/admin/coupons/write" className={styles.createLink}>
                  쿠폰 템플릿 만들기
                </a>
              </div>
            ) : (
              <select
                value={selectedCouponId}
                onChange={e => setSelectedCouponId(e.target.value)}
                className={styles.select}
              >
                {coupons.map(coupon => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.name} ({coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value.toLocaleString()}원`} 할인)
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedCoupon && (
            <div className={styles.couponPreview}>
              <div className={styles.previewCard}>
                <div className={styles.previewHeader}>
                  <span className={styles.previewBadge}>
                    {selectedCoupon.type === 'percentage' ? '퍼센트' : '정액'}
                  </span>
                  <span className={styles.previewName}>{selectedCoupon.name}</span>
                </div>
                <div className={styles.previewValue}>
                  {selectedCoupon.value}
                  {selectedCoupon.type === 'percentage' ? '%' : '원'} 할인
                </div>
                <div className={styles.previewInfo}>
                  <span>{selectedCoupon.minOrderAmount.toLocaleString()}원 이상 주문 시</span>
                  {selectedCoupon.type === 'percentage' && selectedCoupon.maxDiscountAmount && (
                    <span>최대 {selectedCoupon.maxDiscountAmount.toLocaleString()}원 할인</span>
                  )}
                  <span>발급 후 {selectedCoupon.validDays}일간 사용 가능</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            취소
          </button>
          <button
            className={styles.issueBtn}
            onClick={handleIssue}
            disabled={loading || !selectedCouponId || coupons.length === 0}
          >
            {loading ? '발급 중...' : `${selectedUsers.length}명에게 발급`}
          </button>
        </div>
      </div>
    </div>
  )
}
