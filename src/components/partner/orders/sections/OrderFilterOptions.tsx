'use client'

import { useState } from 'react'
import { ChevronDown, Calendar } from 'lucide-react'
import styles from './OrderFilterOptions.module.css'

type DeliveryMethodFilter = 'all' | '퀵업체 배송' | '택배 배송' | '매장 픽업'

interface OrderFilterOptionsProps {
  deliveryMethodFilter: DeliveryMethodFilter
  dateRange: { start: Date | null; end: Date | null }
  onDeliveryFilterChange: (filter: DeliveryMethodFilter) => void
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void
}

export default function OrderFilterOptions({
  deliveryMethodFilter,
  dateRange,
  onDeliveryFilterChange,
  onDateRangeChange,
}: OrderFilterOptionsProps) {
  const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectingStart, setSelectingStart] = useState(true)

  const getDeliveryMethodLabel = () => {
    if (deliveryMethodFilter === 'all') return '주문유형선택'
    return deliveryMethodFilter
  }

  const getDateRangeLabel = () => {
    if (!dateRange.start || !dateRange.end) return '기간 선택'
    const start = dateRange.start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    const end = dateRange.end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    return `${start} - ${end}`
  }

  const handleDateClick = (date: Date) => {
    if (selectingStart) {
      console.log('시작일 선택:', date.toLocaleDateString('ko-KR'))
      onDateRangeChange({ start: date, end: null })
      setSelectingStart(false)
    } else {
      if (dateRange.start && date >= dateRange.start) {
        console.log('종료일 선택:', date.toLocaleDateString('ko-KR'))
        console.log('날짜 범위:', dateRange.start.toLocaleDateString('ko-KR'), '~', date.toLocaleDateString('ko-KR'))
        onDateRangeChange({ ...dateRange, end: date })
        setShowDatePicker(false)
        setSelectingStart(true)
      } else {
        console.log('종료일이 시작일보다 이전입니다. 시작일 재설정:', date.toLocaleDateString('ko-KR'))
        onDateRangeChange({ start: date, end: null })
      }
    }
  }

  const clearDateRange = () => {
    onDateRangeChange({ start: null, end: null })
    setSelectingStart(true)
  }

  const isDateInRange = (date: Date) => {
    if (!dateRange.start || !dateRange.end) return false
    return date >= dateRange.start && date <= dateRange.end
  }

  const isDateSelected = (date: Date) => {
    if (!dateRange.start && !dateRange.end) return false
    if (dateRange.start && date.toDateString() === dateRange.start.toDateString()) return true
    if (dateRange.end && date.toDateString() === dateRange.end.toDateString()) return true
    return false
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)
    const days = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay}></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const isSelected = isDateSelected(date)
      const inRange = isDateInRange(date)

      days.push(
        <div
          key={day}
          className={`${styles.day} ${isSelected ? styles.selectedDate : ''} ${inRange ? styles.inRange : ''}`}
          onClick={() => handleDateClick(date)}
        >
          <span>{day}</span>
        </div>
      )
    }

    return days
  }

  return (
    <div className={styles.filterOptions}>
      {/* 주문 유형 선택 */}
      <div className={styles.dropdownContainer}>
        <div
          className={styles.dropdown}
          onClick={() => {
            setShowDeliveryDropdown(!showDeliveryDropdown)
            setShowDatePicker(false)
          }}
        >
          <span className={styles.dropdownText}>{getDeliveryMethodLabel()}</span>
          <ChevronDown size={16} className={styles.chevronIcon} />
        </div>
        {showDeliveryDropdown && (
          <div className={styles.dropdownMenu}>
            <div
              className={styles.dropdownItem}
              onClick={() => {
                onDeliveryFilterChange('all')
                setShowDeliveryDropdown(false)
              }}
            >
              전체
            </div>
            <div
              className={styles.dropdownItem}
              onClick={() => {
                onDeliveryFilterChange('퀵업체 배송')
                setShowDeliveryDropdown(false)
              }}
            >
              퀵업체 배송
            </div>
            <div
              className={styles.dropdownItem}
              onClick={() => {
                onDeliveryFilterChange('택배 배송')
                setShowDeliveryDropdown(false)
              }}
            >
              택배 배송
            </div>
            <div
              className={styles.dropdownItem}
              onClick={() => {
                onDeliveryFilterChange('매장 픽업')
                setShowDeliveryDropdown(false)
              }}
            >
              매장 픽업
            </div>
          </div>
        )}
      </div>

      {/* 기간 선택 */}
      <div className={styles.dropdownContainer}>
        <div
          className={styles.dropdown}
          onClick={() => {
            setShowDatePicker(!showDatePicker)
            setShowDeliveryDropdown(false)
          }}
        >
          <span className={styles.dropdownText}>{getDateRangeLabel()}</span>
          <Calendar size={16} className={styles.chevronIcon} />
        </div>
        {showDatePicker && (
          <div className={styles.calendar}>
            <div className={styles.calendarHeader}>
              <button className={styles.navButton} onClick={goToPreviousMonth}>‹</button>
              <span className={styles.monthYear}>
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </span>
              <button className={styles.navButton} onClick={goToNextMonth}>›</button>
            </div>
            <div className={styles.weekdays}>
              <div className={styles.weekday}>일</div>
              <div className={styles.weekday}>월</div>
              <div className={styles.weekday}>화</div>
              <div className={styles.weekday}>수</div>
              <div className={styles.weekday}>목</div>
              <div className={styles.weekday}>금</div>
              <div className={styles.weekday}>토</div>
            </div>
            <div className={styles.days}>
              {renderCalendar()}
            </div>
            <div className={styles.calendarFooter}>
              <button className={styles.clearButton} onClick={clearDateRange}>
                초기화
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
