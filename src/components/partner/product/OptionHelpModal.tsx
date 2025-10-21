'use client'

import Image from 'next/image'
import styles from './OptionHelpModal.module.css'

interface OptionHelpModalProps {
  onClose: () => void
}

export default function OptionHelpModal({ onClose }: OptionHelpModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>상품 옵션 설정 가이드</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.imageWrapper}>
            <Image
              src="/assets/option_help.png"
              alt="옵션 설정 예시"
              width={600}
              height={400}
              className={styles.image}
            />
          </div>

          <div className={styles.instructions}>
            <p className={styles.instruction}>
              1. [상품명 입력]란에 판매할 상품의 상품명을 입력해주세요.
            </p>
            <p className={styles.instruction}>
              2. [상품옵션설정]에서 원하는 그룹명을 입력해주세요.
            </p>
            <p className={styles.instruction}>
              3. 옵션그룹명 입력 후, 상품별로 구성하고자 하는 옵션을 설정해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
