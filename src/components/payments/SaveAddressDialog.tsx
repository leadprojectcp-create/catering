'use client'

interface SaveAddressDialogProps {
  show: boolean
  addressName: string
  onAddressNameChange: (name: string) => void
  onSave: () => void
  onClose: () => void
}

export default function SaveAddressDialog({
  show,
  addressName,
  onAddressNameChange,
  onSave,
  onClose
}: SaveAddressDialogProps) {
  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>배송지 저장</h3>
        <input
          type="text"
          placeholder="배송지 이름 (예: 집, 회사)"
          value={addressName}
          onChange={(e) => onAddressNameChange(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}
        />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ccc',
              color: 'black',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            취소
          </button>
          <button
            onClick={onSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
