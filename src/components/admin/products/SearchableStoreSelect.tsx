'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './SearchableStoreSelect.module.css'

interface Store {
  id: string
  storeName: string
  companyName?: string
  partnerId?: string
  partnerEmail?: string
}

interface SearchableStoreSelectProps {
  stores: Store[]
  selectedStoreId: string
  onSelect: (storeId: string) => void
  placeholder?: string
}

export default function SearchableStoreSelect({
  stores,
  selectedStoreId,
  onSelect,
  placeholder = '판매자를 선택해주세요'
}: SearchableStoreSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 선택된 스토어 찾기
  const selectedStore = stores.find(store => store.id === selectedStoreId)

  // 검색 필터링
  const filteredStores = stores.filter(store => {
    const searchLower = searchTerm.toLowerCase()
    const storeName = store.storeName?.toLowerCase() || ''
    const companyName = store.companyName?.toLowerCase() || ''
    return storeName.includes(searchLower) || companyName.includes(searchLower)
  })

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 드롭다운 열릴 때 input에 포커스
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (storeId: string) => {
    onSelect(storeId)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect('')
    setSearchTerm('')
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        className={`${styles.selectBox} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedStore ? (
          <div className={styles.selectedValue}>
            <span>{selectedStore.storeName} {selectedStore.companyName ? `(${selectedStore.companyName})` : ''}</span>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
            >
              ×
            </button>
          </div>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
        <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchWrapper}>
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="판매자 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={(e) => {
                  e.stopPropagation()
                  setSearchTerm('')
                }}
              >
                ×
              </button>
            )}
          </div>
          <ul className={styles.optionList}>
            {filteredStores.length === 0 ? (
              <li className={styles.noResult}>검색 결과가 없습니다</li>
            ) : (
              filteredStores.map((store) => (
                <li
                  key={store.id}
                  className={`${styles.option} ${store.id === selectedStoreId ? styles.selected : ''}`}
                  onClick={() => handleSelect(store.id)}
                >
                  {store.storeName} {store.companyName ? `(${store.companyName})` : ''}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
