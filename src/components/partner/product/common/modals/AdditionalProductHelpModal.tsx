'use client'

import Image from 'next/image'
import styles from './AdditionalProductHelpModal.module.css'

interface AdditionalProductHelpModalProps {
  onClose: () => void
}

export default function AdditionalProductHelpModal({ onClose }: AdditionalProductHelpModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>추가상품 설정안내</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.stepContainer}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>1</div>
              <p className={styles.stepText}>
                기존 상품과 추가로 판매하고 싶은 상품이 있는 경우 <span className={styles.highlight}>[추가상품설정]</span> 버튼 선택후, 추가 상품명과 가격을 입력해주세요.
              </p>
            </div>
            <div className={styles.imageWrapper}>
              <Image
                src="/assets/addoption_help_1.png"
                alt="추가 상품 설정 예시 1"
                width={600}
                height={150}
                className={styles.image}
              />
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.stepContainer}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>2</div>
              <p className={styles.stepText}>
                추가 상품 입력 후, 다른 상품들을 추가로 등록 하고 싶다면, 오른쪽 <span className={styles.highlight}>[플러스]</span> 버튼 선택 후 상품명 및 가격을 입력해주세요.
              </p>
            </div>
            <div className={styles.imageWrapper}>
              <Image
                src="/assets/addoption_help_2.png"
                alt="추가 상품 설정 예시 2"
                width={600}
                height={150}
                className={styles.image}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
