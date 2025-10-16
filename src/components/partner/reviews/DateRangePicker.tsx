'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import styles from './DateRangePicker.module.css'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectingStart, setSelectingStart] = useState(true)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleDateClick = (day: number) => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const selectedDate = new Date(year, month, day)
    const dateString = selectedDate.toISOString().split('T')[0]

    if (selectingStart) {
      onStartDateChange(dateString)
      setSelectingStart(false)
    } else {
      // 종료일이 시작일보다 이전이면 시작일을 초기화
      if (startDate && new Date(dateString) < new Date(startDate)) {
        onStartDateChange(dateString)
        onEndDateChange('')
      } else {
        onEndDateChange(dateString)
        setIsOpen(false)
        setSelectingStart(true)
      }
    }
  }

  const isDateInRange = (day: number) => {
    if (!startDate || !endDate) return false
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const date = new Date(year, month, day)
    return date >= new Date(startDate) && date <= new Date(endDate)
  }

  const isStartDate = (day: number) => {
    if (!startDate) return false
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const date = new Date(year, month, day)
    return date.toISOString().split('T')[0] === startDate
  }

  const isEndDate = (day: number) => {
    if (!endDate) return false
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const date = new Date(year, month, day)
    return date.toISOString().split('T')[0] === endDate
  }

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)
    const days = []

    // 빈 칸 추가
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay}></div>)
    }

    // 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      const isStart = isStartDate(day)
      const isEnd = isEndDate(day)
      const inRange = isDateInRange(day)

      days.push(
        <div
          key={day}
          className={`${styles.day} ${isStart ? styles.startDate : ''} ${isEnd ? styles.endDate : ''} ${inRange && !isStart && !isEnd ? styles.inRange : ''}`}
          onClick={() => handleDateClick(day)}
        >
          <span>{day}</span>
        </div>
      )
    }

    return days
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const getDisplayText = () => {
    if (!startDate && !endDate) return '기간 선택'
    if (startDate && !endDate) return `${formatDateForDisplay(startDate)} ~ 선택중`
    if (startDate && endDate) return `${formatDateForDisplay(startDate)} ~ ${formatDateForDisplay(endDate)}`
    return '기간 선택'
  }

  const clearDates = () => {
    onStartDateChange('')
    onEndDateChange('')
    setSelectingStart(true)
  }

  return (
    <div className={styles.container} ref={calendarRef}>
      <div className={styles.inputWrapper} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.displayText}>{getDisplayText()}</span>
        <div className={styles.iconWrapper}>
          {(startDate || endDate) ? (
            <button
              className={styles.clearButton}
              onClick={(e) => {
                e.stopPropagation()
                clearDates()
              }}
            >
              ✕
            </button>
          ) : (
            <Image
              src="/icons/calendar.png"
              alt="달력"
              width={20}
              height={20}
              className={styles.calendarIcon}
            />
          )}
        </div>
      </div>

      {isOpen && (
        <div className={styles.calendar}>
          <div className={styles.calendarHeader}>
            <button className={styles.navButton} onClick={prevMonth}>
              ‹
            </button>
            <span className={styles.monthYear}>
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </span>
            <button className={styles.navButton} onClick={nextMonth}>
              ›
            </button>
          </div>

          <div className={styles.weekdays}>
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className={styles.weekday}>
                {day}
              </div>
            ))}
          </div>

          <div className={styles.days}>{renderCalendar()}</div>

          <div className={styles.calendarFooter}>
            <span className={styles.helperText}>
              {selectingStart ? '시작일을 선택하세요' : '종료일을 선택하세요'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
