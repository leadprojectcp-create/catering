'use client'

import Image from 'next/image'
import styles from './AgreementsSection.module.css'

interface AgreementsSectionProps {
  agreeAll: boolean
  agreements: {
    privacy: boolean
    terms: boolean
    refund: boolean
    marketing: boolean
  }
  onAgreeAllChange: (checked: boolean) => void
  onAgreementChange: (key: 'privacy' | 'terms' | 'refund' | 'marketing', checked: boolean) => void
  onShowTermsModal: (type: 'privacy' | 'payment' | 'refund') => void
}

export default function AgreementsSection({
  agreeAll,
  agreements,
  onAgreeAllChange,
  onAgreementChange,
  onShowTermsModal
}: AgreementsSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.agreementsContainer}>
        <label className={styles.agreementLabelAll}>
          <div className={styles.checkboxTextWrapper}>
            <div className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                checked={agreeAll}
                onChange={(e) => onAgreeAllChange(e.target.checked)}
              />
              <Image
                src={agreeAll ? '/icons/check_active.png' : '/icons/check_empty.png'}
                alt="체크박스"
                width={20}
                height={20}
                className={styles.checkboxIcon}
              />
            </div>
            <span className={styles.agreementMainText}>주문내용을 확인 및 결제 동의</span>
          </div>
        </label>
        <label
          className={styles.agreementLabelItem}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (!target.closest('input') && !target.closest('.checkboxWrapper')) {
              e.preventDefault()
              onShowTermsModal('privacy')
            }
          }}
        >
          <div className={styles.checkboxTextWrapper}>
            <div className={`${styles.checkboxWrapper} checkboxWrapper`}>
              <input
                type="checkbox"
                checked={agreements.terms}
                onChange={(e) => {
                  e.stopPropagation()
                  onAgreementChange('terms', e.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Image
                src={agreements.terms ? '/icons/check_active.png' : '/icons/check_empty.png'}
                alt="체크박스"
                width={20}
                height={20}
                className={styles.checkboxIcon}
              />
            </div>
            <span>(필수) 개인정보 제3자 정보제공 동의</span>
          </div>
        </label>
        <label
          className={styles.agreementLabelItem}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (!target.closest('input') && !target.closest('.checkboxWrapper')) {
              e.preventDefault()
              onShowTermsModal('payment')
            }
          }}
        >
          <div className={styles.checkboxTextWrapper}>
            <div className={`${styles.checkboxWrapper} checkboxWrapper`}>
              <input
                type="checkbox"
                checked={agreements.refund}
                onChange={(e) => {
                  e.stopPropagation()
                  onAgreementChange('refund', e.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Image
                src={agreements.refund ? '/icons/check_active.png' : '/icons/check_empty.png'}
                alt="체크박스"
                width={20}
                height={20}
                className={styles.checkboxIcon}
              />
            </div>
            <span>(필수) 결제대행 서비스 이용약관 동의</span>
          </div>
        </label>
        <label
          className={styles.agreementLabelItem}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (!target.closest('input') && !target.closest('.checkboxWrapper')) {
              e.preventDefault()
              onShowTermsModal('refund')
            }
          }}
        >
          <div className={styles.checkboxTextWrapper}>
            <div className={`${styles.checkboxWrapper} checkboxWrapper`}>
              <input
                type="checkbox"
                checked={agreements.marketing}
                onChange={(e) => {
                  e.stopPropagation()
                  onAgreementChange('marketing', e.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Image
                src={agreements.marketing ? '/icons/check_active.png' : '/icons/check_empty.png'}
                alt="체크박스"
                width={20}
                height={20}
                className={styles.checkboxIcon}
              />
            </div>
            <span>(필수) 교환 및 반품 안내약관 동의</span>
          </div>
        </label>
      </div>
    </section>
  )
}
