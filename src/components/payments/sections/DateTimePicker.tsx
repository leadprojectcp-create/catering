'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
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
  const [selectedPeriod, setSelectedPeriod] = useState<'오전' | '오후'>('오후')
  const [selectedHour, setSelectedHour] = useState('07')
  const [selectedMinute, setSelectedMinute] = useState('10')

  const periodRef = useRef<HTMLDivElement>(null)
  const hourRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)

  // 시간 선택기가 열릴 때 선택된 항목으로 스크롤
  useEffect(() => {
    if (showTimePicker) {
      setTimeout(() => {
        const isMobile = window.innerWidth <= 768
        const itemHeight = isMobile ? 36 : 40

        // 오전/오후 스크롤
        if (periodRef.current) {
          const periodIndex = selectedPeriod === '오전' ? 0 : 1
          periodRef.current.scrollTop = periodIndex * itemHeight
        }

        // 시간 스크롤
        if (hourRef.current) {
          const hourIndex = parseInt(selectedHour) - 1
          hourRef.current.scrollTop = hourIndex * itemHeight
        }

        // 분 스크롤
        if (minuteRef.current) {
          const minuteValues = ['00', '10', '20', '30', '40', '50']
          const minuteIndex = minuteValues.indexOf(selectedMinute)
          if (minuteIndex >= 0) {
            minuteRef.current.scrollTop = minuteIndex * itemHeight
          }
        }
      }, 0)
    }
  }, [showTimePicker, selectedPeriod, selectedHour, selectedMinute])

  // 모달 열릴 때 백그라운드 스크롤 방지
  useEffect(() => {
    if (showDatePicker || showTimePicker) {
      // 스크롤 방지
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      // 스크롤 방지 해제
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [showDatePicker, showTimePicker])

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

  // 스크롤 이벤트 핸들러 (디바운스 없이 즉시 반응)
  const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, type: 'period' | 'hour' | 'minute') => {
    if (!ref.current) return

    // 모바일과 데스크톱의 item 높이 차이 고려
    const isMobile = window.innerWidth <= 768
    const itemHeight = isMobile ? 36 : 40
    const scrollTop = ref.current.scrollTop

    // 더 정확한 인덱스 계산 (반올림 대신 가장 가까운 아이템 찾기)
    const index = Math.round(scrollTop / itemHeight)

    if (type === 'period') {
      const newPeriod = index === 0 ? '오전' : '오후'
      if (newPeriod !== selectedPeriod) {
        setSelectedPeriod(newPeriod)
      }
    } else if (type === 'hour') {
      const newHour = String(index + 1).padStart(2, '0')
      if (newHour !== selectedHour && index >= 0 && index < 12) {
        setSelectedHour(newHour)
      }
    } else if (type === 'minute') {
      const minuteValues = ['00', '10', '20', '30', '40', '50']
      if (index >= 0 && index < minuteValues.length) {
        const newMinute = minuteValues[index]
        if (newMinute !== selectedMinute) {
          setSelectedMinute(newMinute)
        }
      }
    }
  }

  // 시간/분 옵션 생성 (1-12시)
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const minutes = ['00', '10', '20', '30', '40', '50']

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
            <div
              className={styles.calendarModal}
              onWheel={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onTouchMove={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              <div className={styles.dateHeader}>
                <span>날짜 선택</span>
                <button onClick={() => setShowDatePicker(false)}>✕</button>
              </div>
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
                  const hour24 = parseInt(h)
                  if (hour24 >= 12) {
                    setSelectedPeriod('오후')
                    setSelectedHour(hour24 === 12 ? '12' : String(hour24 - 12).padStart(2, '0'))
                  } else {
                    setSelectedPeriod('오전')
                    setSelectedHour(hour24 === 0 ? '12' : String(hour24).padStart(2, '0'))
                  }
                  setSelectedMinute(m)
                }
                setShowTimePicker(!showTimePicker)
              }}
              readOnly
            />
            {showTimePicker && (
              <div
                className={styles.timeModal}
                onWheel={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onTouchMove={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <div className={styles.timeHeader}>
                  <span>시간 선택</span>
                  <button onClick={() => setShowTimePicker(false)}>✕</button>
                </div>
                <div
                  className={styles.timePickerContainer}
                  onWheel={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <div className={styles.timeColumn}>
                    <div
                      ref={periodRef}
                      className={styles.scrollContainer}
                      onScroll={() => handleScroll(periodRef, 'period')}
                    >
                      {['오전', '오후'].map((period) => (
                        <div
                          key={period}
                          className={`${styles.scrollItem} ${selectedPeriod === period ? styles.scrollItemActive : ''}`}
                          onClick={() => {
                            setSelectedPeriod(period as '오전' | '오후')
                            if (periodRef.current) {
                              const isMobile = window.innerWidth <= 768
                              const itemHeight = isMobile ? 36 : 40
                              const index = period === '오전' ? 0 : 1
                              periodRef.current.scrollTo({ top: index * itemHeight, behavior: 'auto' })
                            }
                          }}
                        >
                          {period}
                        </div>
                      ))}
                    </div>
                    <div className={styles.selectionHighlight}></div>
                  </div>
                  <div className={styles.timeColumn}>
                    <div
                      ref={hourRef}
                      className={styles.scrollContainer}
                      onScroll={() => handleScroll(hourRef, 'hour')}
                    >
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className={`${styles.scrollItem} ${selectedHour === hour ? styles.scrollItemActive : ''}`}
                          onClick={() => {
                            setSelectedHour(hour)
                            if (hourRef.current) {
                              const isMobile = window.innerWidth <= 768
                              const itemHeight = isMobile ? 36 : 40
                              const index = parseInt(hour) - 1
                              hourRef.current.scrollTo({ top: index * itemHeight, behavior: 'auto' })
                            }
                          }}
                        >
                          {hour}
                        </div>
                      ))}
                    </div>
                    <div className={styles.selectionHighlight}></div>
                  </div>
                  <div className={styles.timeColumn}>
                    <div
                      ref={minuteRef}
                      className={styles.scrollContainer}
                      onScroll={() => handleScroll(minuteRef, 'minute')}
                    >
                      {minutes.map((minute, idx) => (
                        <div
                          key={minute}
                          className={`${styles.scrollItem} ${selectedMinute === minute ? styles.scrollItemActive : ''}`}
                          onClick={() => {
                            setSelectedMinute(minute)
                            if (minuteRef.current) {
                              const isMobile = window.innerWidth <= 768
                              const itemHeight = isMobile ? 36 : 40
                              minuteRef.current.scrollTo({ top: idx * itemHeight, behavior: 'auto' })
                            }
                          }}
                        >
                          {minute}
                        </div>
                      ))}
                    </div>
                    <div className={styles.selectionHighlight}></div>
                  </div>
                </div>
                <div className={styles.timeFooter}>
                  <button onClick={() => {
                    let hour24 = parseInt(selectedHour)
                    if (selectedPeriod === '오후' && hour24 !== 12) {
                      hour24 += 12
                    } else if (selectedPeriod === '오전' && hour24 === 12) {
                      hour24 = 0
                    }
                    const time = `${String(hour24).padStart(2, '0')}:${selectedMinute}`
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
