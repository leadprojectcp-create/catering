'use client'

import Link from 'next/link'
import Image from 'next/image'
import styles from './Header.module.css'

const categories = [
  '전체',
  '케이터링 박스 / 플래터',
  '샌드위치 / 베이커리',
  '디저트 박스',
  '김밥 / 한식 도시락',
  '샐러드 / 과일 도시락',
  '음료 / 커피 / 차',
  '떡 / 전통한과 / 견과류'
]

interface HeaderProps {
  selectedCategory?: string
  onCategorySelect?: (category: string) => void
}

export default function Header({ selectedCategory = '전체', onCategorySelect }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* 로고와 슬로건 영역 */}
        <div className={styles.logoSection}>
          <div className={styles.logoContainer}>
            <Link href="/">
              <Image
                src="/assets/logo.png"
                alt="단체주문 로고"
                width={192}
                height={32}
                className={styles.logo}
                quality={100}
                priority
              />
            </Link>
          </div>
          <div className={styles.slogan}>단체주문부터 답례품까지 픽투잇에서 한번에</div>
        </div>

        {/* 카테고리 메뉴 영역 */}
        <div className={styles.menuSection}>
          <div className={styles.menuContainer}>
            {categories.map((category) => (
              <div
                key={category}
                className={`${styles.menuItem} ${selectedCategory === category ? styles.menuItemActive : ''}`}
                onClick={() => onCategorySelect?.(category)}
              >
                {category}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}