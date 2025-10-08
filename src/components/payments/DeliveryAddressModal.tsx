'use client'

import { DeliveryAddress } from './types'

interface DeliveryAddressModalProps {
  show: boolean
  addresses: DeliveryAddress[]
  onClose: () => void
  onLoadAddress: (address: DeliveryAddress) => void
  onDeleteAddress: (addressId: string) => void
}

export default function DeliveryAddressModal({
  show,
  addresses,
  onClose,
  onLoadAddress,
  onDeleteAddress
}: DeliveryAddressModalProps) {
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
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>저장된 배송지</h3>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ccc',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            닫기
          </button>
        </div>
        {addresses.map((address) => (
          <div
            key={address.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px',
              marginBottom: '12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>{address.name}</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                주문자: {address.orderer}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                전화번호: {address.phone}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                주소: {address.address}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
              <button
                onClick={() => onLoadAddress(address)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  whiteSpace: 'nowrap'
                }}
              >
                불러오기
              </button>
              <button
                onClick={() => onDeleteAddress(address.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  whiteSpace: 'nowrap'
                }}
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
