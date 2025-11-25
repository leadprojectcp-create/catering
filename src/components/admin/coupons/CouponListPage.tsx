'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Timestamp } from 'firebase/firestore'
import { getAllCouponTemplates, deleteCouponTemplate, formatCouponValue } from '@/lib/services/couponService'
import type { CouponTemplate } from '@/lib/services/couponService'
import Loading from '@/components/Loading'
import styles from './CouponListPage.module.css'

export default function CouponListPage() {
  const router = useRouter()
  const [coupons, setCoupons] = useState<CouponTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    loadCoupons()
  }, [])

  const loadCoupons = async () => {
    try {
      setLoading(true)
      const data = await getAllCouponTemplates()
      setCoupons(data)
    } catch (error) {
      console.error('쿠폰 목록 로드 실패:', error)
      alert('쿠폰 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 쿠폰 템플릿을 삭제하시겠습니까?\n이미 발급된 쿠폰은 영향받지 않습니다.`)) {
      return
    }

    try {
      await deleteCouponTemplate(id)
      setCoupons(coupons.filter(c => c.id !== id))
      alert('삭제되었습니다.')
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const formatDate = (date: Timestamp | undefined) => {
    if (!date) return '-'
    return date.toDate().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const filteredCoupons = coupons.filter(coupon => {
    if (filter === 'all') return true
    if (filter === 'active') return coupon.isActive
    return !coupon.isActive
  })

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>쿠폰 템플릿 관리</h1>
        <div className={styles.headerActions}>
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              전체 ({coupons.length})
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
              onClick={() => setFilter('active')}
            >
              활성 ({coupons.filter(c => c.isActive).length})
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'inactive' ? styles.active : ''}`}
              onClick={() => setFilter('inactive')}
            >
              비활성 ({coupons.filter(c => !c.isActive).length})
            </button>
          </div>
          <button
            className={styles.createBtn}
            onClick={() => router.push('/admin/coupons/write')}
          >
            + 새 쿠폰 템플릿
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>쿠폰명</th>
              <th>할인</th>
              <th>최소 주문금액</th>
              <th>최대 할인</th>
              <th>유효기간</th>
              <th>상태</th>
              <th>생성일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoupons.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  쿠폰 템플릿이 없습니다.
                </td>
              </tr>
            ) : (
              filteredCoupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <div className={styles.couponName}>
                      <strong>{coupon.name}</strong>
                      {coupon.description && (
                        <span className={styles.description}>{coupon.description}</span>
                      )}
                    </div>
                  </td>
                  <td className={styles.discountValue}>
                    {formatCouponValue(coupon)}
                  </td>
                  <td>{coupon.minOrderAmount.toLocaleString()}원</td>
                  <td>
                    {coupon.type === 'percentage' && coupon.maxDiscountAmount
                      ? `${coupon.maxDiscountAmount.toLocaleString()}원`
                      : '-'}
                  </td>
                  <td>{coupon.validDays}일</td>
                  <td>
                    <span className={`${styles.status} ${coupon.isActive ? styles.statusActive : styles.statusInactive}`}>
                      {coupon.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td>{formatDate(coupon.createdAt)}</td>
                  <td className={styles.actions}>
                    <button
                      className={styles.editBtn}
                      onClick={() => router.push(`/admin/coupons/edit/${coupon.id}`)}
                    >
                      수정
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(coupon.id!, coupon.name)}
                    >
                      삭제
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
