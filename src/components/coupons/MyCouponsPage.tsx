'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getUserCoupons, formatCouponValue } from '@/lib/services/couponService'
import type { UserCoupon } from '@/lib/services/couponService'
import Loading from '@/components/Loading'
import styles from './MyCouponsPage.module.css'

export default function MyCouponsPage() {
  const { user, loading: authLoading } = useAuth()
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'used' | 'expired'>('all')

  useEffect(() => {
    if (user) {
      loadCoupons()
    }
  }, [user])

  const loadCoupons = async () => {
    if (!user) return

    try {
      setLoading(true)
      const data = await getUserCoupons(user.uid)

      // 만료 상태 업데이트
      const now = new Date()
      const updatedCoupons = data.map(coupon => {
        if (coupon.status === 'available' && coupon.expiresAt.toDate() < now) {
          return { ...coupon, status: 'expired' as const }
        }
        return coupon
      })

      setCoupons(updatedCoupons)
    } catch (error) {
      console.error('쿠폰 목록 로드 실패:', error)
      alert('쿠폰 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate()
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return '사용 가능'
      case 'used': return '사용 완료'
      case 'expired': return '기간 만료'
      default: return status
    }
  }

  const filteredCoupons = coupons.filter(coupon => {
    if (filter === 'all') return true
    return coupon.status === filter
  })

  if (authLoading || loading) {
    return <Loading />
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>로그인이 필요합니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>내 쿠폰</h1>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 ({coupons.length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'available' ? styles.active : ''}`}
            onClick={() => setFilter('available')}
          >
            사용 가능 ({coupons.filter(c => c.status === 'available').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'used' ? styles.active : ''}`}
            onClick={() => setFilter('used')}
          >
            사용 완료 ({coupons.filter(c => c.status === 'used').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'expired' ? styles.active : ''}`}
            onClick={() => setFilter('expired')}
          >
            만료 ({coupons.filter(c => c.status === 'expired').length})
          </button>
        </div>
      </div>

      <div className={styles.couponList}>
        {filteredCoupons.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{filter === 'all' ? '보유한 쿠폰이 없습니다.' : `${getStatusLabel(filter)} 쿠폰이 없습니다.`}</p>
          </div>
        ) : (
          filteredCoupons.map((coupon) => (
            <div
              key={coupon.id}
              className={`${styles.couponCard} ${coupon.status !== 'available' ? styles.inactive : ''}`}
            >
              <div className={styles.couponLeft}>
                <div className={styles.couponBadge}>
                  {coupon.type === 'percentage' ? '퍼센트' : '정액'}
                </div>
                <div className={styles.couponValue}>
                  {formatCouponValue(coupon)}
                </div>
              </div>
              <div className={styles.couponRight}>
                <div className={styles.couponName}>{coupon.couponName}</div>
                {coupon.description && (
                  <div className={styles.couponDescription}>{coupon.description}</div>
                )}
                <div className={styles.couponConditions}>
                  <span>{coupon.minOrderAmount.toLocaleString()}원 이상 주문 시</span>
                  {coupon.type === 'percentage' && coupon.maxDiscountAmount && (
                    <span>최대 {coupon.maxDiscountAmount.toLocaleString()}원 할인</span>
                  )}
                </div>
                <div className={styles.couponFooter}>
                  <span className={styles.couponExpiry}>
                    {formatDate(coupon.expiresAt)}까지
                  </span>
                  <span className={`${styles.couponStatus} ${styles[coupon.status]}`}>
                    {getStatusLabel(coupon.status)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
