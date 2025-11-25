'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCouponTemplate, updateCouponTemplate } from '@/lib/services/couponService'
import Loading from '@/components/Loading'
import styles from './CouponWritePage.module.css'

interface CouponEditPageProps {
  couponId: string
}

export default function CouponEditPage({ couponId }: CouponEditPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    validDays: '30',
    isActive: true
  })

  useEffect(() => {
    loadCoupon()
  }, [couponId])

  const loadCoupon = async () => {
    try {
      const coupon = await getCouponTemplate(couponId)
      if (!coupon) {
        alert('쿠폰을 찾을 수 없습니다.')
        router.push('/admin/coupons')
        return
      }

      setFormData({
        name: coupon.name,
        description: coupon.description || '',
        type: coupon.type,
        value: String(coupon.value),
        minOrderAmount: String(coupon.minOrderAmount),
        maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '',
        validDays: String(coupon.validDays),
        isActive: coupon.isActive
      })
    } catch (error) {
      console.error('쿠폰 로드 실패:', error)
      alert('쿠폰을 불러오는데 실패했습니다.')
      router.push('/admin/coupons')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('쿠폰명을 입력해주세요.')
      return
    }

    if (!formData.value || Number(formData.value) <= 0) {
      alert('할인 값을 입력해주세요.')
      return
    }

    if (formData.type === 'percentage' && Number(formData.value) > 100) {
      alert('퍼센트 할인은 100%를 초과할 수 없습니다.')
      return
    }

    if (!formData.minOrderAmount || Number(formData.minOrderAmount) < 0) {
      alert('최소 주문금액을 입력해주세요.')
      return
    }

    if (!formData.validDays || Number(formData.validDays) <= 0) {
      alert('유효기간을 입력해주세요.')
      return
    }

    try {
      setSaving(true)
      await updateCouponTemplate(couponId, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        value: Number(formData.value),
        minOrderAmount: Number(formData.minOrderAmount),
        maxDiscountAmount: formData.type === 'percentage' && formData.maxDiscountAmount
          ? Number(formData.maxDiscountAmount)
          : undefined,
        validDays: Number(formData.validDays),
        isActive: formData.isActive
      })

      alert('쿠폰 템플릿이 수정되었습니다.')
      router.push('/admin/coupons')
    } catch (error) {
      console.error('쿠폰 수정 실패:', error)
      alert('쿠폰 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>쿠폰 템플릿 수정</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            쿠폰명 <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="예: 신규 가입 10% 할인"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>설명</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="쿠폰에 대한 간단한 설명 (선택사항)"
            className={styles.textarea}
            rows={3}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              할인 타입 <span className={styles.required}>*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="percentage">퍼센트 할인 (%)</option>
              <option value="fixed">고정 금액 할인 (원)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              할인 값 <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
                placeholder={formData.type === 'percentage' ? '10' : '5000'}
                className={styles.input}
                min="1"
                max={formData.type === 'percentage' ? 100 : undefined}
              />
              <span className={styles.unit}>
                {formData.type === 'percentage' ? '%' : '원'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              최소 주문금액 <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                name="minOrderAmount"
                value={formData.minOrderAmount}
                onChange={handleChange}
                placeholder="30000"
                className={styles.input}
                min="0"
              />
              <span className={styles.unit}>원</span>
            </div>
            <span className={styles.hint}>
              이 금액 이상 주문 시에만 사용 가능
            </span>
          </div>

          {formData.type === 'percentage' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>최대 할인금액</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  value={formData.maxDiscountAmount}
                  onChange={handleChange}
                  placeholder="5000"
                  className={styles.input}
                  min="0"
                />
                <span className={styles.unit}>원</span>
              </div>
              <span className={styles.hint}>
                비워두면 할인 금액 제한 없음
              </span>
            </div>
          )}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              유효기간 <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                name="validDays"
                value={formData.validDays}
                onChange={handleChange}
                placeholder="30"
                className={styles.input}
                min="1"
              />
              <span className={styles.unit}>일</span>
            </div>
            <span className={styles.hint}>
              발급일로부터 사용 가능한 기간
            </span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>상태</label>
            <div className={styles.checkboxWrapper}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <span>활성화 (발급 가능)</span>
              </label>
            </div>
            <span className={styles.hint}>
              비활성 상태면 새로 발급할 수 없음
            </span>
          </div>
        </div>

        <div className={styles.preview}>
          <h3 className={styles.previewTitle}>미리보기</h3>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <span className={styles.previewBadge}>
                {formData.type === 'percentage' ? '퍼센트' : '정액'}
              </span>
              <span className={styles.previewName}>
                {formData.name || '쿠폰명'}
              </span>
            </div>
            <div className={styles.previewValue}>
              {formData.value || '0'}
              {formData.type === 'percentage' ? '%' : '원'} 할인
            </div>
            <div className={styles.previewInfo}>
              <span>{Number(formData.minOrderAmount || 0).toLocaleString()}원 이상 주문 시</span>
              {formData.type === 'percentage' && formData.maxDiscountAmount && (
                <span>최대 {Number(formData.maxDiscountAmount).toLocaleString()}원 할인</span>
              )}
              <span>발급 후 {formData.validDays || 0}일간 사용 가능</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.cancelBtn}
            disabled={saving}
          >
            취소
          </button>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
