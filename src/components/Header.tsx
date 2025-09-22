'use client'

import Link from 'next/link'
import Image from 'next/image'
import styles from './Header.module.css'

export default function Header() {
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
          <div className={styles.slogan}>단체주문부터 답례품까지 밀랩에서 한번에</div>
        </div>

        {/* 카테고리 메뉴 영역 */}
        <div className={styles.menuSection}>
          <div className={styles.menuContainer}>
            <div className={styles.menuItem}>전체</div>
            <div className={styles.menuItem}>떡 / 전통한과 / 견과류</div>
            <div className={styles.menuItem}>음료 / 커피 / 차</div>
            <div className={styles.menuItem}>초콜릿 / 사탕</div>
            <div className={styles.menuItem}>과일 도시락</div>
            <div className={styles.menuItem}>김밥 / 컵밥류</div>
            <div className={styles.menuItem}>샐러드 도시락</div>
            <div className={styles.menuItem}>브런치 박스</div>
            <div className={styles.menuItem}>샌드위치 / 베이커리</div>
            <div className={styles.menuItem}>케이터링 박스 / 플래터</div>
          </div>
        </div>
      </div>
    </header>
  )
}