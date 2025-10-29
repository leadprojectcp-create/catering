'use client'

import React, { useState } from 'react'
import { ProductFormData } from '../common/types/types'
import styles from './PriceSection.module.css'

interface PriceSectionProps {
  price: number
  discount: ProductFormData['discount']
  onChange: (data: { price?: number; discount?: ProductFormData['discount'] }) => void
}

export default function PriceSection({ price, discount, onChange }: PriceSectionProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectingDate, setSelectingDate] = useState<'start' | 'end'>('start')
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  // Helper functions
  const formatNumberWithCommas = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const parseFormattedNumber = (str: string): number => {
    return Number(str.replace(/,/g, ''))
  }

  const calculateDiscountedPrice = (): number => {
    if (!discount || !discount.enabled || !discount.value) return price

    if (discount.type === 'amount') {
      return Math.max(0, price - discount.value)
    } else {
      return Math.max(0, price - (price * discount.value / 100))
    }
  }

  const calculateDiscountPercent = (): number => {
    if (!discount || !discount.enabled || !discount.value || !price) return 0

    if (discount.type === 'percent') {
      return discount.value
    } else {
      return Math.round((discount.value / price) * 100)
    }
  }

  // 달력 관련 함수들
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth, year, month }
  }

  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    // 시간을 00:00:00으로 설정하여 ISO 형식으로 저장
    return `${year}-${month}-${day}T00:00:00`
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const formattedDate = formatDateToYYYYMMDD(selectedDate)

    if (selectingDate === 'start') {
      onChange({
        discount: { ...discount!, startDate: formattedDate, endDate: null }
      })
      setSelectingDate('end')
    } else {
      // 종료일은 시작일 이후만 선택 가능
      if (discount?.startDate && formattedDate <= discount.startDate) {
        alert('종료일은 시작일 이후여야 합니다.')
        return
      }
      onChange({
        discount: { ...discount!, endDate: formattedDate }
      })
      setShowCalendar(false)
      setSelectingDate('start') // 다음 선택을 위해 초기화
    }
  }

  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + direction)
    setCurrentMonth(newMonth)
  }

  const renderCalendar = () => {
    const monthData = getDaysInMonth(currentMonth)
    const days = []

    // 현재 날짜 (시간 제외)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Empty cells for days before month starts
    for (let i = 0; i < monthData.firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.calendarDay}></div>)
    }

    // Days of the month
    for (let day = 1; day <= monthData.daysInMonth; day++) {
      const currentDate = formatDateToYYYYMMDD(new Date(monthData.year, monthData.month, day))
      const currentDateObj = new Date(monthData.year, monthData.month, day)
      currentDateObj.setHours(0, 0, 0, 0)

      // 날짜 비교를 위해 날짜 부분만 추출 (YYYY-MM-DD 형식)
      const currentDateOnly = currentDate.split('T')[0]
      const startDateOnly = discount?.startDate?.split('T')[0]
      const endDateOnly = discount?.endDate?.split('T')[0]
      const hoverDateOnly = hoverDate?.split('T')[0]

      const isStartDate = currentDateOnly === startDateOnly
      const isEndDate = currentDateOnly === endDateOnly

      // 실제 선택된 범위
      const isInRange = startDateOnly && endDateOnly &&
                        currentDateOnly > startDateOnly && currentDateOnly < endDateOnly

      // 호버 시 미리보기 범위 (종료일 선택 중일 때)
      const isHoverRange = selectingDate === 'end' && startDateOnly && hoverDateOnly &&
                          currentDateOnly > startDateOnly && currentDateOnly < hoverDateOnly

      const isHoverEnd = selectingDate === 'end' && currentDateOnly === hoverDateOnly

      // 과거 날짜는 비활성화
      const isPastDate = currentDateObj < today

      // 종료일 선택 중일 때 시작일 이전은 비활성화
      const isDisabled = isPastDate || (selectingDate === 'end' && startDateOnly && currentDateOnly <= startDateOnly)

      days.push(
        <div
          key={day}
          className={`${styles.calendarDay} ${isStartDate ? styles.calendarDayStart : ''} ${isEndDate ? styles.calendarDayEnd : ''} ${isInRange ? styles.calendarDayInRange : ''} ${isHoverRange ? styles.calendarDayHoverRange : ''} ${isHoverEnd ? styles.calendarDayHoverEnd : ''} ${isDisabled ? styles.calendarDayDisabled : ''}`}
          onClick={() => !isDisabled && handleDateSelect(day)}
          onMouseEnter={() => !isDisabled && setHoverDate(currentDate)}
          onMouseLeave={() => setHoverDate(null)}
        >
          {day}
        </div>
      )
    }

    return (
      <div className={styles.calendarDropdown}>
        <div className={styles.calendarHeader}>
          <button type="button" onClick={() => changeMonth(-1)} className={styles.calendarNavButton}>
            ‹
          </button>
          <span className={styles.calendarMonth}>
            {monthData.year}년 {monthData.month + 1}월
          </span>
          <button type="button" onClick={() => changeMonth(1)} className={styles.calendarNavButton}>
            ›
          </button>
        </div>
        <div className={styles.calendarWeekdays}>
          <div>일</div>
          <div>월</div>
          <div>화</div>
          <div>수</div>
          <div>목</div>
          <div>금</div>
          <div>토</div>
        </div>
        <div className={styles.calendarGrid}>
          {days}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.titleWithNumber}>
        <span className={styles.numberCircle}>5</span>
        <span className={styles.sectionTitle}>상품 판매가</span>
        <span className={styles.optionalLabel}>(단일상품가격을 적어주세요)</span>
      </div>
      <div className={styles.priceInputRow}>
        <div className={`${styles.inputWithUnit} ${styles.priceInputWrapper}`}>
          <input
            type="text"
            value={price ? formatNumberWithCommas(price) : ''}
            onChange={(e) => {
              const numericValue = parseFormattedNumber(e.target.value)
              onChange({ price: numericValue })
            }}
            placeholder=""
            className={styles.textInput}
            required
          />
          <span className={styles.inputUnit}>원</span>
        </div>
        <label className={`${styles.checkboxLabel} ${styles.checkboxNoMargin}`} style={{ whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={discount?.enabled || false}
            onChange={(e) => onChange({
              discount: { ...discount!, enabled: e.target.checked }
            })}
            className={styles.hiddenCheckbox}
          />
          <span className={styles.customCheckbox}>
            <img
              src={discount?.enabled ? "/icons/check_active.png" : "/icons/check.png"}
              alt="체크박스"
            />
          </span>
          할인 적용
        </label>
      </div>

      {/* 할인 설정 영역 */}
      {discount?.enabled && (
        <div className={styles.discountSection}>
          {/* 할인 유형 */}
          <div className={styles.discountInputGroup}>
            <label className={styles.discountLabel}>할인 유형</label>
            <div className={styles.discountTypeButtons}>
              <button
                type="button"
                onClick={() => onChange({
                  discount: { ...discount!, type: 'amount' }
                })}
                className={discount.type === 'amount' ? styles.discountTypeButtonActive : styles.discountTypeButton}
              >
                정액할인(원)
              </button>
              <button
                type="button"
                onClick={() => onChange({
                  discount: { ...discount!, type: 'percent' }
                })}
                className={discount.type === 'percent' ? styles.discountTypeButtonActive : styles.discountTypeButton}
              >
                정률할인(%)
              </button>
            </div>
          </div>

          {/* 할인 금액/율 */}
          <div className={styles.discountInputGroup}>
            <label className={styles.discountLabel}>
              {discount.type === 'amount' ? '할인 금액' : '할인율'}
            </label>
            <div className={styles.inputWithUnit}>
              <input
                type="number"
                value={discount.value || ''}
                onChange={(e) => onChange({
                  discount: { ...discount!, value: Number(e.target.value) }
                })}
                placeholder="0"
                className={styles.textInput}
              />
              <span className={styles.inputUnit}>{discount.type === 'amount' ? '원' : '%'}</span>
            </div>
          </div>

          {/* 진행 기간 */}
          <div className={styles.discountInputGroup}>
            <div className={styles.dateRangeHeader}>
              <label className={`${styles.discountLabel} ${styles.labelNoMargin}`}>진행 기간</label>
              <label className={`${styles.checkboxLabel} ${styles.checkboxNoMargin}`}>
                <input
                  type="checkbox"
                  checked={discount.isAlwaysActive}
                  onChange={(e) => {
                    onChange({
                      discount: {
                        ...discount!,
                        isAlwaysActive: e.target.checked,
                        startDate: e.target.checked ? null : discount!.startDate,
                        endDate: e.target.checked ? null : discount!.endDate
                      }
                    })
                    setShowCalendar(false)
                  }}
                  className={styles.hiddenCheckbox}
                />
                <span className={styles.customCheckbox}>
                  <img
                    src={discount.isAlwaysActive ? "/icons/check_active.png" : "/icons/check.png"}
                    alt="체크박스"
                  />
                </span>
                상시 적용
              </label>
            </div>
            <div className={styles.dateRangeWrapper}>
              <div className={styles.dateInputContainer}>
                <input
                  type="text"
                  value={
                    discount.startDate && discount.endDate
                      ? `${(discount.startDate.split('T')[0] || discount.startDate).replace(/-/g, '.')} ~ ${(discount.endDate.split('T')[0] || discount.endDate).replace(/-/g, '.')}`
                      : discount.startDate
                      ? `${(discount.startDate.split('T')[0] || discount.startDate).replace(/-/g, '.')} ~ 종료일 선택`
                      : '기간 선택'
                  }
                  placeholder="기간 선택"
                  className={styles.dateInput}
                  disabled={discount?.isAlwaysActive}
                  readOnly
                  onClick={() => {
                    if (!discount?.isAlwaysActive) {
                      setShowCalendar(!showCalendar)
                      setSelectingDate('start')
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.calendarButton}
                  disabled={discount.isAlwaysActive}
                  onClick={() => {
                    setShowCalendar(!showCalendar)
                    setSelectingDate('start')
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6.66667 1.66666V4.16666M13.3333 1.66666V4.16666M2.5 7.49999H17.5M4.16667 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 4.99999V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16667C3.24619 18.3333 2.5 17.5871 2.5 16.6667V4.99999C2.5 4.07952 3.24619 3.33333 4.16667 3.33333Z" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {showCalendar && !discount.isAlwaysActive && renderCalendar()}
              </div>
            </div>
          </div>

          {/* 할인 적용 결과 */}
          {discount.value > 0 && (
            <div className={styles.discountPreview}>
              <div className={styles.discountPreviewRow}>
                <span style={{ color: '#666' }}>원가</span>
                <span className={styles.discountOriginalPrice}>
                  {formatNumberWithCommas(price)}원
                </span>
              </div>
              <div className={styles.discountPreviewRow}>
                <span className={styles.discountPriceLabel}>할인가</span>
                <div style={{ textAlign: 'right' }}>
                  <span className={styles.discountBadge}>
                    {calculateDiscountPercent()}%
                  </span>
                  <span className={styles.discountFinalPrice}>
                    {formatNumberWithCommas(Math.round(calculateDiscountedPrice()))}원
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
