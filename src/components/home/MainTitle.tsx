'use client'

import styles from './MainTitle.module.css'

export default function MainTitle() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        모임, 행사, 기업 단체주문<br />
        단모에서 딱 맞는 판매자를 찾아보세요.
      </h1>
    </div>
  )
}
