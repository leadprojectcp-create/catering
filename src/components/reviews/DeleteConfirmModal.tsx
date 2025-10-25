import styles from './DeleteConfirmModal.module.css'

interface DeleteConfirmModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({ onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.message}>리뷰를 삭제하시겠습니까?</p>
        <div className={styles.buttonGroup}>
          <button className={styles.cancelButton} onClick={onCancel}>
            취소
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
