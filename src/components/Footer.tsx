'use client'

import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.companyName}>Meal Lab</div>
        <div className={styles.companyInfo}>
          (주)리프컴퍼니 | CEO 박상호 | 사업자 등록번호 413-87-02826
        </div>
        <div className={styles.address}>
          서울특별시 광진구 아차산로62길 14-12(구의동, 대영트윈,투) 
        </div>
        <div className={styles.copyright}>
          © 2025 Leapcompany. All rights reserved.
        </div>
      </div>
    </footer>
  )
}