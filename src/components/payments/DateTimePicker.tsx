'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './DateTimePicker.module.css'

interface DateTimePickerProps {
  deliveryDate: string
  deliveryTime: string
  minOrderDays?: number
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

export default function DateTimePicker({
  deliveryDate,
  deliveryTime,
  minOrderDays = 0,
  onDateChange,
  onTimeChange
}: DateTimePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedHour, setSelectedHour] = useState(0)
  const [selectedMinute, setSelectedMinute] = useState(0)

  // 무한 스크롤을 위한 배열 생성
  const generateInfiniteArray = (max: number, repeatCount: number = 100) => {
    const arr = []
    for (let i = 0; i < repeatCount; i++) {
      for (let j = 0; j < max; j++) {
        arr.push(j)
      }
    }
    return arr
  }

  const hours = generateInfiniteArray(24)
  const minutes = generateInfiniteArray(60)

  // 시간 피커 열릴 때 중앙으로 스크롤
  const initializeTimePicker = () => {
    setTimeout(() => {
      const hourScroll = document.getElementById('hourScroll')
      const minuteScroll = document.getElementById('minuteScroll')

      if (hourScroll && minuteScroll) {
        const itemHeight = 40
        const middleIndex = Math.floor(hours.length / 2)

        // 현재 선택된 시간으로 스크롤 (정확히 중앙에 위치)
        const hourIndex = middleIndex - (middleIndex % 24) + selectedHour
        const minuteIndex = Math.floor(minutes.length / 2) - (Math.floor(minutes.length / 2) % 60) + selectedMinute

        hourScroll.scrollTop = hourIndex * itemHeight
        minuteScroll.scrollTop = minuteIndex * itemHeight

        // 스크롤 이벤트 리스너
        const handleScroll = (element: HTMLElement, setter: (val: number) => void, max: number, arr: number[]) => {
          const scrollTop = element.scrollTop
          const index = Math.round(scrollTop / itemHeight)
          const value = arr[index] !== undefined ? arr[index] % max : 0
          setter(value)
        }

        hourScroll.addEventListener('scroll', () => handleScroll(hourScroll, setSelectedHour, 24, hours))
        minuteScroll.addEventListener('scroll', () => handleScroll(minuteScroll, setSelectedMinute, 60, minutes))
      }
    }, 10)
  }

  // 달력 날짜 생성
  const generateCalendar = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 최소 선택 가능 날짜 (오늘부터 minOrderDays 이후)
    const minDate = new Date(today)
    minDate.setDate(minDate.getDate() + minOrderDays)
    minDate.setHours(0, 0, 0, 0)

    // 최대 선택 가능 날짜 (오늘부터 30일 후)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 30)
    maxDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)

      const isCurrentMonth = date.getMonth() === month
      const isBeforeMinDate = date < minDate
      const isToday = date.getTime() === today.getTime()
      const isBeyondMaxDate = date > maxDate

      days.push({
        date: date,
        day: date.getDate(),
        isCurrentMonth,
        isPast: isBeforeMinDate || isBeyondMaxDate, // minOrderDays 이전 날짜 또는 30일 이후 날짜 모두 비활성화
        isToday,
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      })
    }

    return days
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleTimeConfirm = () => {
    const time = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`
    onTimeChange(time)
    setShowTimePicker(false)
  }

  const calendar = generateCalendar()

  return (
    <>
      {/* 날짜 선택 */}
      <div className={styles.formRow}>
        <label className={styles.label}>날짜선택</label>
        <div className={styles.pickerWrapper}>
          <input
            type="text"
            className={styles.input}
            placeholder="배송날짜를 선택해주세요"
            value={formatDate(deliveryDate)}
            onClick={() => setShowDatePicker(!showDatePicker)}
            readOnly
          />
          {showDatePicker && (
            <div className={styles.calendarModal}>
              <div className={styles.calendarHeader}>
                <button onClick={prevMonth}>
                  <Image
                    src="/icons/arrow.svg"
                    alt="이전"
                    width={25}
                    height={25}
                    style={{ transform: 'rotate(180deg)' }}
                  />
                </button>
                <span>{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</span>
                <button onClick={nextMonth}>
                  <Image
                    src="/icons/arrow.svg"
                    alt="다음"
                    width={25}
                    height={25}
                  />
                </button>
              </div>
              <div className={styles.calendarWeekdays}>
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className={styles.weekday}>{day}</div>
                ))}
              </div>
              <div className={styles.calendarDays}>
                {calendar.map((day, idx) => (
                  <div
                    key={idx}
                    className={`${styles.calendarDay}
                      ${!day.isCurrentMonth ? styles.otherMonth : ''}
                      ${day.isPast ? styles.disabled : ''}
                      ${day.isToday ? styles.today : ''}
                      ${deliveryDate === day.value ? styles.selected : ''}`}
                    onClick={() => {
                      if (!day.isPast && day.isCurrentMonth) {
                        onDateChange(day.value)
                        setShowDatePicker(false)
                      }
                    }}
                  >
                    {day.day}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 시간 선택 */}
      <div className={styles.formRow}>
        <label className={styles.label}>시간선택</label>
        <div className={styles.pickerWrapper}>
          <input
            type="text"
            className={styles.input}
            placeholder="배송시간을 선택해주세요"
            value={deliveryTime}
            onClick={() => {
              if (deliveryTime) {
                const [h, m] = deliveryTime.split(':')
                setSelectedHour(parseInt(h))
                setSelectedMinute(parseInt(m))
              }
              setShowTimePicker(!showTimePicker)
              if (!showTimePicker) {
                initializeTimePicker()
              }
            }}
            readOnly
          />
          {showTimePicker && (
            <div className={styles.timeModal}>
              <div className={styles.timeHeader}>
                <span>시간 선택</span>
                <button onClick={() => setShowTimePicker(false)}>✕</button>
              </div>
              <div className={styles.wheelPicker}>
                <div className={styles.wheelColumn}>
                  <div className={styles.wheelScroll} id="hourScroll">
                    {hours.map((hour, idx) => (
                      <div
                        key={idx}
                        className={`${styles.wheelItem} ${selectedHour === hour ? styles.wheelItemSelected : ''}`}
                        onClick={() => {
                          setSelectedHour(hour)
                          const hourScroll = document.getElementById('hourScroll')
                          if (hourScroll) {
                            const itemHeight = 40
                            hourScroll.scrollTop = idx * itemHeight
                          }
                        }}
                      >
                        {String(hour).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.wheelSeparator}>:</div>
                <div className={styles.wheelColumn}>
                  <div className={styles.wheelScroll} id="minuteScroll">
                    {minutes.map((minute, idx) => (
                      <div
                        key={idx}
                        className={`${styles.wheelItem} ${selectedMinute === minute ? styles.wheelItemSelected : ''}`}
                        onClick={() => {
                          setSelectedMinute(minute)
                          const minuteScroll = document.getElementById('minuteScroll')
                          if (minuteScroll) {
                            const itemHeight = 40
                            minuteScroll.scrollTop = idx * itemHeight
                          }
                        }}
                      >
                        {String(minute).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.selectionHighlight}></div>
              <div className={styles.timeFooter}>
                <button onClick={handleTimeConfirm}>확인</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
