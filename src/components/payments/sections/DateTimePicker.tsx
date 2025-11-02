'use client'

import { useState } from 'react'
import Image from 'next/image'
import Picker from 'react-mobile-picker'
import styles from './DateTimePicker.module.css'

interface DateTimePickerProps {
  deliveryDate: string
  deliveryTime: string
  minOrderDays?: number
  deliveryMethod?: string
  quantityRanges?: {
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]
  totalQuantity?: number
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

export default function DateTimePicker({
  deliveryDate,
  deliveryTime,
  minOrderDays = 0,
  deliveryMethod,
  quantityRanges,
  totalQuantity = 0,
  onDateChange,
  onTimeChange
}: DateTimePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  // quantityRanges를 기반으로 현재 수량에 맞는 daysBeforeOrder 계산
  const getMinDaysForQuantity = () => {
    if (!quantityRanges || quantityRanges.length === 0) {
      return minOrderDays
    }

    // 현재 수량에 맞는 범위 찾기
    for (const range of quantityRanges) {
      if (totalQuantity >= range.minQuantity && totalQuantity <= range.maxQuantity) {
        return range.daysBeforeOrder
      }
    }

    // 해당하는 범위가 없으면 마지막 범위의 daysBeforeOrder 사용
    return quantityRanges[quantityRanges.length - 1].daysBeforeOrder
  }

  // 선택 가능한 최소 날짜를 계산하여 초기 달력 표시
  const getInitialMonth = () => {
    const today = new Date()
    const minDate = new Date(today)
    const calculatedMinDays = getMinDaysForQuantity()
    minDate.setDate(minDate.getDate() + calculatedMinDays)
    return minDate
  }

  const [currentMonth, setCurrentMonth] = useState(getInitialMonth())
  const [pickerValue, setPickerValue] = useState({
    hour: '00',
    minute: '00'
  })

  // react-mobile-picker용 데이터 생성
  const pickerSelections = {
    hour: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
    minute: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
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

    // 최소 선택 가능 날짜 (오늘부터 계산된 일수 이후)
    const calculatedMinDays = getMinDaysForQuantity()
    const minDate = new Date(today)
    minDate.setDate(minDate.getDate() + calculatedMinDays)
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
        isPast: isBeforeMinDate || isBeyondMaxDate, // 계산된 일수 이전 날짜 또는 30일 이후 날짜 모두 비활성화
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

      {/* 시간 선택 - 택배 배송이 아닐 때만 표시 */}
      {deliveryMethod !== '택배 배송' && (
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
                  setPickerValue({ hour: h, minute: m })
                }
                setShowTimePicker(!showTimePicker)
              }}
              readOnly
            />
            {showTimePicker && (
              <div className={styles.timeModal}>
                <div className={styles.timeHeader}>
                  <span>시간 선택</span>
                  <button onClick={() => setShowTimePicker(false)}>✕</button>
                </div>
                <div className={styles.pickerContainer}>
                  <Picker
                    value={pickerValue}
                    onChange={setPickerValue}
                    wheelMode="natural"
                    height={200}
                    itemHeight={40}
                  >
                    {Object.keys(pickerSelections).map((name) => (
                      <Picker.Column key={name} name={name}>
                        {pickerSelections[name as keyof typeof pickerSelections].map((option) => (
                          <Picker.Item
                            key={option}
                            value={option}
                            style={{
                              color: pickerValue[name as keyof typeof pickerValue] === option ? '#025BD9' : '#ccc',
                              fontSize: pickerValue[name as keyof typeof pickerValue] === option ? '20px' : '14px',
                              fontWeight: pickerValue[name as keyof typeof pickerValue] === option ? 600 : 400,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {option}
                          </Picker.Item>
                        ))}
                      </Picker.Column>
                    ))}
                  </Picker>
                  <div className={styles.timeSeparator}>:</div>
                </div>
                <div className={styles.timeFooter}>
                  <button onClick={() => {
                    const time = `${pickerValue.hour}:${pickerValue.minute}`
                    onTimeChange(time)
                    setShowTimePicker(false)
                  }}>확인</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
