'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateProductStatus } from '@/lib/services/productService'
import type { ProductData } from '@/lib/services/productService'
import Loading from '@/components/Loading'
import Image from 'next/image'
import styles from './ProductManagementPage.module.css'

interface Product extends ProductData {
  id: string
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      const productsData: Product[] = []

      querySnapshot.forEach((doc) => {
        productsData.push({
          id: doc.id,
          ...doc.data() as ProductData
        })
      })

      setProducts(productsData)
    } catch (error) {
      console.error('상품 목록 로드 실패:', error)
      alert('상품 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (productId: string, newStatus: 'active' | 'inactive' | 'pending') => {
    if (!confirm(`이 상품의 상태를 ${getStatusLabel(newStatus)}(으)로 변경하시겠습니까?`)) {
      return
    }

    try {
      await updateProductStatus(productId, newStatus)
      setProducts(products.map(p =>
        p.id === productId ? { ...p, status: newStatus } : p
      ))
      alert('상태가 변경되었습니다.')
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return '활성'
      case 'inactive': return '비활성'
      case 'pending': return '대기'
      default: return '대기'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '0'
    return new Intl.NumberFormat('ko-KR').format(num)
  }

  const handleViewDetail = (product: Product) => {
    setSelectedProduct(product)
    setShowDetailModal(true)
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedProduct(null)
  }

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true
    return product.status === filter
  })

  if (loading) {
    return <Loading />
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>상품 관리</h1>
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 ({products.length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
            onClick={() => setFilter('active')}
          >
            활성 ({products.filter(p => p.status === 'active').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'pending' ? styles.active : ''}`}
            onClick={() => setFilter('pending')}
          >
            대기 ({products.filter(p => p.status === 'pending').length})
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'inactive' ? styles.active : ''}`}
            onClick={() => setFilter('inactive')}
          >
            비활성 ({products.filter(p => p.status === 'inactive').length})
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>이미지</th>
              <th>상품명</th>
              <th>가격</th>
              <th>파트너</th>
              <th>카테고리</th>
              <th>조회수</th>
              <th>주문수</th>
              <th>등록일</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.empty}>
                  상품이 없습니다.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className={styles.productImage}>
                      {product.images && product.images.length > 0 ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          width={60}
                          height={60}
                          style={{ objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div className={styles.noImage}>이미지 없음</div>
                      )}
                    </div>
                  </td>
                  <td>{product.name}</td>
                  <td>{formatNumber(product.discountedPrice || product.price)}원</td>
                  <td>{product.partnerEmail || '-'}</td>
                  <td>{product.category || '-'}</td>
                  <td>{formatNumber(product.viewCount)}</td>
                  <td>{formatNumber(product.orderCount)}</td>
                  <td>{formatDate(product.createdAt)}</td>
                  <td>
                    <select
                      className={styles.statusSelect}
                      value={product.status || 'pending'}
                      onChange={(e) => handleStatusChange(product.id, e.target.value as 'active' | 'inactive' | 'pending')}
                    >
                      <option value="pending">대기</option>
                      <option value="active">활성</option>
                      <option value="inactive">비활성</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className={styles.detailBtn}
                      onClick={() => handleViewDetail(product)}
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 상세보기 모달 */}
      {showDetailModal && selectedProduct && (
        <div className={styles.modalOverlay} onClick={closeDetailModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>상품 상세정보</h2>
              <button className={styles.closeBtn} onClick={closeDetailModal}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* 상품 이미지 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>상품 이미지</h3>
                <div className={styles.imageGallery}>
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    selectedProduct.images.map((img, idx) => (
                      <div key={idx} className={styles.galleryImage}>
                        <Image
                          src={img}
                          alt={`${selectedProduct.name} ${idx + 1}`}
                          width={150}
                          height={150}
                          style={{ objectFit: 'cover', borderRadius: '8px' }}
                        />
                      </div>
                    ))
                  ) : (
                    <p>이미지가 없습니다.</p>
                  )}
                </div>
              </div>

              {/* 기본 정보 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>기본 정보</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>상품명:</span>
                    <span className={styles.detailValue}>{selectedProduct.name}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>가격:</span>
                    <span className={styles.detailValue}>{formatNumber(selectedProduct.price)}원</span>
                  </div>
                  {selectedProduct.discount && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>할인가:</span>
                      <span className={styles.detailValue}>{formatNumber(selectedProduct.discountedPrice)}원</span>
                    </div>
                  )}
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>카테고리:</span>
                    <span className={styles.detailValue}>{selectedProduct.category || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>주문 형태:</span>
                    <span className={styles.detailValue}>{selectedProduct.orderType || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>최소 주문량:</span>
                    <span className={styles.detailValue}>{selectedProduct.minOrderQuantity}개</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>최대 주문량:</span>
                    <span className={styles.detailValue}>{selectedProduct.maxOrderQuantity}개</span>
                  </div>
                </div>
              </div>

              {/* 상품 설명 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>상품 설명</h3>
                <p className={styles.description}>{selectedProduct.description || '설명이 없습니다.'}</p>
              </div>

              {/* 옵션 */}
              {selectedProduct.options && selectedProduct.options.length > 0 && (
                <div className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>상품 옵션</h3>
                  {selectedProduct.options.map((option, idx) => (
                    <div key={idx} className={styles.optionGroup}>
                      <h4 className={styles.optionGroupName}>{option.groupName}</h4>
                      <ul className={styles.optionList}>
                        {option.values.map((value, vIdx) => (
                          <li key={vIdx} className={styles.optionItem}>
                            {value.name}: +{formatNumber(value.price)}원
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* 배송 방법 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>배송 방법</h3>
                <div className={styles.deliveryMethods}>
                  {selectedProduct.deliveryMethods?.self && <span className={styles.badge}>자체 배송</span>}
                  {selectedProduct.deliveryMethods?.quick && <span className={styles.badge}>퀵 배송</span>}
                  {selectedProduct.deliveryMethods?.pickup && <span className={styles.badge}>픽업</span>}
                </div>
              </div>

              {/* 추가 설정 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>추가 설정</h3>
                <div className={styles.additionalSettings}>
                  {selectedProduct.additionalSettings?.sameDayDelivery && <span className={styles.badge}>당일 배송</span>}
                  {selectedProduct.additionalSettings?.thermalPack && <span className={styles.badge}>보냉팩</span>}
                  {selectedProduct.additionalSettings?.stickerCustom && <span className={styles.badge}>스티커 커스텀</span>}
                  {selectedProduct.additionalSettings?.giftItem && <span className={styles.badge}>선물용품</span>}
                </div>
              </div>

              {/* 원산지 */}
              {selectedProduct.origin && selectedProduct.origin.length > 0 && (
                <div className={styles.detailSection}>
                  <h3 className={styles.detailSectionTitle}>원산지</h3>
                  <ul className={styles.originList}>
                    {selectedProduct.origin.map((item, idx) => (
                      <li key={idx} className={styles.originItem}>
                        {item.ingredient}: {item.origin}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 파트너 정보 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>파트너 정보</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>파트너 이메일:</span>
                    <span className={styles.detailValue}>{selectedProduct.partnerEmail || '-'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>등록일:</span>
                    <span className={styles.detailValue}>{formatDate(selectedProduct.createdAt)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>수정일:</span>
                    <span className={styles.detailValue}>{formatDate(selectedProduct.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* 통계 */}
              <div className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>통계</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>조회수:</span>
                    <span className={styles.detailValue}>{formatNumber(selectedProduct.viewCount)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>주문수:</span>
                    <span className={styles.detailValue}>{formatNumber(selectedProduct.orderCount)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>상태:</span>
                    <span className={styles.detailValue}>{getStatusLabel(selectedProduct.status)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeModalBtn} onClick={closeDetailModal}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
