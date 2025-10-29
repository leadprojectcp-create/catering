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
          <h2 className={styles.title}>상품옵션설정안내</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <p className={styles.stepText}>
                <span className={styles.highlight}>[상품명 입력]</span> 란에 판매할 상품의 상품명을 입력해주세요.{'\n'}
                옵션구성이 필요한 상품일 경우, 상품옵션설정 버튼을 선택해주세요.
              </p>
              <div className={styles.imageWrapper}>
                <Image
                  src="/assets/option_help_1.png"
                  alt="옵션 설정 예시 1"
                  width={600}
                  height={150}
                  className={styles.image}
                />
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <p className={styles.stepText}>
                <span className={styles.highlight}>[상품옵션설정]</span> <span className={styles.highlight}>[상품 판매가]</span> 버튼 선택 후, 기본 판매구성 상품명을 입력해주세요.{'\n'}
                옵션 가격은 <span className={styles.highlight}>[상품 판매가]</span> 입력이 완료되었기 때문에 +0원으로 입력해주세요.
              </p>
              <div className={styles.imageWrapper}>
                <Image
                  src="/assets/option_help_2.png"
                  alt="옵션 설정 예시 2"
                  width={600}
                  height={150}
                  className={styles.image}
                />
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <p className={styles.stepText}>
                <span className={styles.highlight}>[옵션명추가]</span> 버튼 선택 후, 옵션 구성 별로 기본 판매 금액 상품과 다른 구성의 상품명과 구성별 <span className={styles.highlight}>[추가옵션가격]</span>을 입력해주세요.
              </p>
              <div className={styles.imageWrapper}>
                <Image
                  src="/assets/option_help_3.png"
                  alt="옵션 설정 예시 3"
                  width={600}
                  height={150}
                  className={styles.image}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
