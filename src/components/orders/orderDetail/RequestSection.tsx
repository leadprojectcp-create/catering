'use client'

import styles from '../OrderDetailPage.module.css'

interface Props {
  request?: string
}

export default function RequestSection({ request }: Props) {
  if (!request) return null

  return (
    <section className={styles.orderDetailSection}>
      <div className={styles.requestSection}>
        <div className={styles.requestLabel}>매장 요청사항</div>
        <div className={styles.requestValue}>{request}</div>
      </div>
    </section>
  )
}
