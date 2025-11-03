'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './CustomDropdown.module.css'

interface CustomDropdownProps {
  value: string
  placeholder?: string
  options: string[]
  onChange: (value: string) => void
  className?: string
}

export default function CustomDropdown({
  value,
  placeholder = '선택해주세요',
  options,
  onChange,
  className
}: CustomDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <div className={`${styles.customSelectWrapper} ${className || ''}`}>
      <div
        className={styles.customSelect}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span>{value || placeholder}</span>
        <Image
          src="/icons/arrow.svg"
          alt="화살표"
          width={20}
          height={20}
          style={{ transform: showDropdown ? 'rotate(-90deg)' : 'rotate(90deg)' }}
        />
      </div>
      {showDropdown && (
        <div className={styles.customDropdown}>
          {options.map((option) => (
            <div
              key={option}
              className={styles.dropdownItem}
              onClick={() => {
                onChange(option)
                setShowDropdown(false)
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
