'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import styles from './LocationSettingModal.module.css'

interface LocationSettingModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationSet?: (location: { address: string; latitude: number; longitude: number }) => void
  onOpenModal: () => void
  currentLocation: string | null
  inline?: boolean  // filterSection 내부에서 사용 시 true
}

interface SearchResult {
  address: string
  roadAddress: string
  latitude: number
  longitude: number
}

export default function LocationSettingModal({ isOpen, onClose, onLocationSet, onOpenModal, currentLocation, inline = false }: LocationSettingModalProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 시/도 단위 제거 함수
  const removeProvince = (address: string) => {
    return address.replace(/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|충청북도|충청남도|전북특별자치도|전라남도|경상북도|경상남도|제주특별자치도)\s*/g, '')
  }

  // 자동 검색을 위한 useEffect (debounce 적용)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      handleSearch()
    }, 1000) // 1000ms 후에 검색

    return () => clearTimeout(timer)
  }, [searchQuery])

  // 주소 검색 (Next.js API Route를 통해 Kakao REST API 호출)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)

    try {
      const response = await fetch(
        `/api/kakao/search-address?query=${encodeURIComponent(searchQuery)}`
      )

      console.log('응답 상태:', response.status, response.statusText)

      const data = await response.json()
      console.log('주소 검색 API 응답:', data)
      console.log('documents:', data.documents)
      console.log('meta:', data.meta)

      if (data.documents && data.documents.length > 0) {
        const results: SearchResult[] = data.documents.map((item: any) => {
          console.log('검색 결과 아이템:', item)

          // address 타입일 경우
          if (item.address) {
            return {
              address: item.address.address_name || '',
              roadAddress: item.road_address?.address_name || item.address.address_name || '',
              latitude: parseFloat(item.address.y),
              longitude: parseFloat(item.address.x)
            }
          }

          // road_address 타입일 경우
          if (item.road_address) {
            return {
              address: item.address_name || '',
              roadAddress: item.road_address.address_name || '',
              latitude: parseFloat(item.road_address.y),
              longitude: parseFloat(item.road_address.x)
            }
          }

          // 기본 형식
          return {
            address: item.address_name || '',
            roadAddress: item.road_address_name || item.address_name || '',
            latitude: parseFloat(item.y),
            longitude: parseFloat(item.x)
          }
        })

        setSearchResults(results)
        console.log('파싱된 검색 결과:', results)
      } else {
        console.log('검색 결과 없음 - documents가 비어있음')
        alert('검색 결과가 없습니다.')
        setSearchResults([])
      }
    } catch (error) {
      console.error('주소 검색 실패:', error)
      alert('주소 검색에 실패했습니다.')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  // 현재 위치로 찾기 (Kakao REST API) - 바로 저장까지
  const handleCurrentLocation = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    if (!navigator.geolocation) {
      alert('브라우저가 위치 서비스를 지원하지 않습니다.')
      return
    }

    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const response = await fetch(
            `/api/kakao/coord2address?x=${longitude}&y=${latitude}`
          )

          const data = await response.json()
          console.log('좌표 → 주소 변환 결과:', data)

          if (data.documents && data.documents.length > 0) {
            const item = data.documents[0]
            const location: SearchResult = {
              address: item.address?.address_name || '',
              roadAddress: item.road_address?.address_name || item.address?.address_name || '',
              latitude,
              longitude
            }

            // 바로 저장
            try {
              const userRef = doc(db, 'users', user.uid)
              await updateDoc(userRef, {
                location: {
                  address: location.address,
                  roadAddress: location.roadAddress,
                  latitude: location.latitude,
                  longitude: location.longitude
                },
                updatedAt: new Date()
              })

              console.log('위치 저장 완료:', location)

              if (onLocationSet) {
                onLocationSet({
                  address: location.roadAddress || location.address,
                  latitude: location.latitude,
                  longitude: location.longitude
                })
              }

              alert('현재 위치가 설정되었습니다.')

              // 모달이 열려있으면 닫기
              if (isOpen) {
                onClose()
              }
            } catch (saveError) {
              console.error('위치 저장 실패:', saveError)
              alert('위치 저장에 실패했습니다.')
            }
          } else {
            alert('현재 위치를 가져올 수 없습니다.')
          }
        } catch (error) {
          console.error('좌표 변환 실패:', error)
          alert('현재 위치를 가져올 수 없습니다.')
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        setLoading(false)
        console.error('위치 조회 실패:', error)
        alert('위치 권한을 허용해주세요.')
      }
    )
  }

  // 위치 선택
  const handleSelectLocation = (location: SearchResult) => {
    setSelectedLocation(location)
  }

  // 위치 저장
  const handleSaveLocation = async () => {
    if (!selectedLocation || !user) {
      alert('위치를 선택해주세요.')
      return
    }

    try {
      setSaving(true)

      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        location: {
          address: selectedLocation.address,
          roadAddress: selectedLocation.roadAddress,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude
        },
        updatedAt: new Date()
      })

      console.log('위치 저장 완료:', selectedLocation)

      if (onLocationSet) {
        onLocationSet({
          address: selectedLocation.roadAddress || selectedLocation.address,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude
        })
      }

      alert('위치가 설정되었습니다.')
      onClose()
    } catch (error) {
      console.error('위치 저장 실패:', error)
      alert('위치 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // Enter 키로 검색
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // 모달이 닫힐 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSearchResults([])
      setSelectedLocation(null)
    }
  }, [isOpen])

  return (
    <>
      {/* 위치 설정 버튼 */}
      <div className={inline ? styles.locationBarInline : styles.locationBar}>
        <button
          className={styles.locationButton}
          onClick={onOpenModal}
        >
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C7.24 2 5 4.24 5 7c0 3.75 5 11 5 11s5-7.25 5-11c0-2.76-2.24-5-5-5zm0 6.5c-.83 0-1.5-.67-1.5-1.5S9.17 5.5 10 5.5s1.5.67 1.5 1.5S10.83 8.5 10 8.5z" fill="#333333"/>
          </svg>
          <span>{currentLocation ? removeProvince(currentLocation) : '위치를 설정해주세요'}</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="#4E5968" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* 현재 위치로 버튼 (모바일에만 표시) */}
        <button
          className={styles.currentLocationLink}
          onClick={handleCurrentLocation}
        >
          <img src="/icons/currency_location.png" alt="location" width="16" height="16" />
          현재 위치로
        </button>
      </div>

      {/* 데스크톱: 팝업 모달 */}
      {isOpen && (
        <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>위치 설정</h2>
            <button className={styles.closeButton} onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className={styles.subtitle}>설정된 위치가 가까이 있는 업체를 보여드려요!</p>

          {/* 검색 입력 */}
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 15L21 21M10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17Z" stroke="#DADDE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="지번, 도로명, 건물명으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                className={styles.clearButton}
                onClick={() => setSearchQuery('')}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" fill="#999" />
                  <path d="M7 7l6 6M13 7l-6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* 현재 위치로 찾기 버튼 */}
          <button className={styles.currentLocationButton} onClick={handleCurrentLocation} disabled={loading}>
            <img src="/icons/currency_location.png" alt="location" width="20" height="20" />
            현재 위치로 찾기
          </button>

          {/* 검색 결과 */}
          <div className={styles.resultsList}>
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <div key={index}>
                  <div
                    className={`${styles.resultItem} ${selectedLocation === result ? styles.selected : ''}`}
                    onClick={() => handleSelectLocation(result)}
                  >
                    <div className={styles.resultText}>
                      <div className={styles.resultAddress}>{result.address}</div>
                      <div className={styles.resultSubAddress}>{result.roadAddress || result.address}</div>
                    </div>
                    {selectedLocation === result && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#4E7FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.divider} />
                </div>
              ))
            ) : (
              !loading && searchQuery && (
                <div className={styles.emptyState}>검색 결과가 없습니다.</div>
              )
            )}
          </div>

          {/* 저장 버튼 */}
          <button
            className={styles.saveButton}
            onClick={handleSaveLocation}
            disabled={!selectedLocation || saving}
          >
            {saving ? '저장 중...' : '위치설정완료'}
          </button>
        </div>
      </div>
      )}

      {/* 모바일: 바텀 모달 */}
      {isOpen && (
        <div className={styles.bottomSheet} onClick={onClose}>
        <div className={styles.bottomSheetContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.bottomSheetHandle} />

          <div className={styles.header}>
            <h2 className={styles.title}>위치 설정</h2>
            <button className={styles.closeButton} onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className={styles.subtitle}>설정된 위치가 가까이 있는 업체를 보여드려요!</p>

          {/* 검색 입력 */}
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 15L21 21M10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10C17 13.866 13.866 17 10 17Z" stroke="#DADDE2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="지번, 도로명, 건물명으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                className={styles.clearButton}
                onClick={() => setSearchQuery('')}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" fill="#999" />
                  <path d="M7 7l6 6M13 7l-6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* 현재 위치로 찾기 버튼 */}
          <button className={styles.currentLocationButton} onClick={handleCurrentLocation} disabled={loading}>
            <img src="/icons/currency_location.png" alt="location" width="20" height="20" />
            현재 위치로 찾기
          </button>

          {/* 검색 결과 */}
          <div className={styles.resultsList}>
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <div key={index}>
                  <div
                    className={`${styles.resultItem} ${selectedLocation === result ? styles.selected : ''}`}
                    onClick={() => handleSelectLocation(result)}
                  >
                    <div className={styles.resultText}>
                      <div className={styles.resultAddress}>{result.address}</div>
                      <div className={styles.resultSubAddress}>{result.roadAddress || result.address}</div>
                    </div>
                    {selectedLocation === result && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#4E7FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.divider} />
                </div>
              ))
            ) : (
              !loading && searchQuery && (
                <div className={styles.emptyState}>검색 결과가 없습니다.</div>
              )
            )}
          </div>

          {/* 저장 버튼 */}
          <button
            className={styles.saveButton}
            onClick={handleSaveLocation}
            disabled={!selectedLocation || saving}
          >
            {saving ? '저장 중...' : '위치설정완료'}
          </button>
        </div>
      </div>
      )}
    </>
  )
}
