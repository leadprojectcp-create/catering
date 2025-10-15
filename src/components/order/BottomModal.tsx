'use client'

import { ReactNode } from 'react'
import styles from './BottomModal.module.css'

interface BottomModalProps {
  isOpen: boolean
  modalHeight: number
  onClose: () => void
  onDragStart: (e: React.TouchEvent | React.MouseEvent) => void
  children: ReactNode
}

export default function BottomModal({
  isOpen,
  modalHeight,
  onClose,
  onDragStart,
  children
}: BottomModalProps) {
  return (
    <>
      {/* 모달 오버레이 */}
      <div
        className={`${styles.modalOverlay} ${isOpen ? styles.open : ''}`}
        onClick={onClose}
      />

      <div
        className={`${styles.bottomModal} ${isOpen ? styles.open : ''}`}
        style={{ maxHeight: `${modalHeight}vh` }}
      >
        {/* 드래그 핸들 */}
        <div
          className={styles.dragHandle}
          onTouchStart={onDragStart}
          onMouseDown={onDragStart}
        >
          <div className={styles.dragBar}></div>
        </div>

        {children}
      </div>
    </>
  )
}
