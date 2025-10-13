'use client'

import styles from './Wishlist.module.css'

export default function Wishlist() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.emptyState}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <p className={styles.emptyText}>찜한 상품이 없습니다</p>
          <p className={styles.emptySubtext}>마음에 드는 상품을 찜해보세요</p>
        </div>
      </div>
    </div>
  )
}
