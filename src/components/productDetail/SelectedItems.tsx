'use client'

import OptimizedImage from '@/components/common/OptimizedImage'
import { Product, CartItem, getOptionPrice, getAdditionalOptionPrice } from './ProductDetailPage'
import styles from './SelectedItems.module.css'

interface SelectedItemsProps {
  product: Product
  cartItems: CartItem[]
  storeRequest: string
  deliveryMethod: string
  parcelPaymentMethod?: '선결제' | '착불'
  onRemoveItem: (index: number) => void
  onUpdateQuantity: (index: number, newQuantity: number) => void
  onQuantityInputChange: (index: number, value: string) => void
  onStoreRequestChange: (value: string) => void
  onSaveToCart: () => void
  onOrder: () => void
  onParcelPaymentMethodChange?: (method: '선결제' | '착불') => void
  calculateItemPrice: (options: { [key: string]: string }, qty: number, additionalOptions?: { [key: string]: string }) => number
  calculateTotalPrice: () => number
}

export default function SelectedItems({
  product,
  cartItems,
  storeRequest,
  deliveryMethod,
  parcelPaymentMethod,
  onRemoveItem,
  onUpdateQuantity,
  onQuantityInputChange,
  onStoreRequestChange,
  onSaveToCart,
  onOrder,
  onParcelPaymentMethodChange,
  calculateItemPrice,
  calculateTotalPrice
}: SelectedItemsProps) {
  // 전체 수량 계산
  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0)

  // 최소/최대 주문 수량
  const minQty = product.minOrderQuantity || 1
  const maxQty = product.maxOrderQuantity || 999

  // 버튼 활성화 여부 (전체 수량이 최소~최대 범위 내에 있어야 함)
  const isOrderValid = totalQuantity >= minQty && totalQuantity <= maxQty

  return (
    <div className={styles.selectedSection}>
      <h3 className={styles.selectedTitle}>선택된 상품</h3>
      <div className={styles.selectedItem}>
        {cartItems.map((item, index) => {
          return (
          <div key={index} className={styles.cartItemWrapper}>
            <div className={styles.selectedHeader}>
              <div className={styles.selectedName}>{product.name}</div>
              <button
                onClick={() => onRemoveItem(index)}
                className={styles.removeButton}
              >
                <OptimizedImage
                  src="/icons/trash.svg"
                  alt="삭제"
                  width={16}
                  height={16}
                />
              </button>
            </div>
            {/* 옵션이 있을 때만 표시 */}
            {Object.keys(item.options).length > 0 && (
              <div className={styles.optionSection}>
                <div className={styles.optionSectionTitle}>상품 옵션</div>
                {Object.entries(item.options).map(([groupName, optionValue]) => {
                  // 쉼표로 구분된 여러 옵션을 분리
                  const optionNames = optionValue.split(',').map(name => name.trim())

                  return (
                    <div key={groupName}>
                      {optionNames.map((optionName, idx) => {
                        // 각 옵션의 가격을 개별적으로 가져오기
                        const optionPrice = getOptionPrice(product, groupName, optionName)

                        return (
                          <div key={`${groupName}-${idx}`} className={styles.selectedOption}>
                            <div>
                              <span className={styles.optionGroupName}>[{groupName}]</span>
                              <span>{optionName}</span>
                            </div>
                            <span className={styles.optionPrice}>+{optionPrice.toLocaleString()}원</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
            {item.additionalOptions && Object.keys(item.additionalOptions).length > 0 && (
              <div className={styles.optionSection}>
                <div className={styles.optionSectionTitle}>추가상품</div>
                {Object.entries(item.additionalOptions).map(([groupName, optionValue]) => {
                  // 쉼표로 구분된 여러 옵션을 분리
                  const optionNames = optionValue.split(',').map(name => name.trim())

                  return (
                    <div key={`additional-${groupName}`}>
                      {optionNames.map((optionName, idx) => {
                        // 각 추가옵션의 가격을 가져오기 (additionalOptions에서)
                        const optionPrice = getAdditionalOptionPrice(product, groupName, optionName)

                        return (
                          <div key={`additional-${groupName}-${idx}`} className={styles.selectedOption}>
                            <div>
                              <span className={styles.optionGroupName}>[{groupName}]</span>
                              <span>{optionName}</span>
                            </div>
                            <span className={styles.optionPrice}>+{optionPrice.toLocaleString()}원</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
            <div className={styles.quantityControl}>
              <button
                onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                className={styles.quantityButton}
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={item.quantity || ''}
                onChange={(e) => {
                  const value = e.target.value
                  // 숫자만 입력 가능하도록
                  if (value === '' || /^\d+$/.test(value)) {
                    onQuantityInputChange(index, value)
                  }
                }}
                className={styles.quantityValue}
              />
              <button
                onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                className={styles.quantityButton}
              >
                +
              </button>
            </div>
            <div className={styles.itemPrice}>
              {calculateItemPrice(item.options, item.quantity, item.additionalOptions).toLocaleString()}원
            </div>
          </div>
          )
        })}
      </div>

      {/* 매장 요청사항 */}
      <div className={styles.requestContainer}>
        <h3 className={styles.requestTitle}>매장 요청사항</h3>
        <div className={styles.requestSection}>
          <textarea
            className={styles.requestTextarea}
            placeholder="매장에 전달할 요청사항을 입력해주세요"
            value={storeRequest}
            onChange={(e) => onStoreRequestChange(e.target.value)}
            maxLength={500}
          />
          <div className={styles.requestCount}>
            {storeRequest.length}/500
          </div>
        </div>
      </div>

      {/* 택배 배송 결제 방식 */}
      {deliveryMethod === '택배 배송' && product.deliveryFeeSettings && product.deliveryFeeSettings.paymentMethods && product.deliveryFeeSettings.paymentMethods.length > 0 && (
        <div className={styles.parcelPaymentContainer}>
          <div className={styles.parcelPaymentHeader}>
            <h3 className={styles.parcelPaymentTitle}>배송비 결제 방식</h3>
            {product.deliveryFeeSettings.type === '조건부 무료' && (
              <div className={styles.feeConditionNotice}>
                <OptimizedImage src="/icons/delivery.svg" alt="배송" width={16} height={16} />
                <span>
                  {calculateTotalPrice() >= (product.deliveryFeeSettings.freeCondition || 0)
                    ? `${product.deliveryFeeSettings.freeCondition?.toLocaleString()}원 이상 구매로 배송비 무료!`
                    : `${product.deliveryFeeSettings.freeCondition?.toLocaleString()}원 이상 구매 시 배송비 무료`}
                </span>
              </div>
            )}
            {product.deliveryFeeSettings.type === '수량별' && (
              <div className={styles.feeConditionNotice}>
                <OptimizedImage src="/icons/delivery.svg" alt="배송" width={16} height={16} />
                <span>
                  {product.deliveryFeeSettings.perQuantity}개당 {(product.deliveryFeeSettings.baseFee || 0).toLocaleString()}원
                </span>
              </div>
            )}
          </div>
          {/* 조건부 무료일 때 조건 달성 시 선결제/착불 선택 버튼 숨김 */}
          {!(product.deliveryFeeSettings.type === '조건부 무료' && calculateTotalPrice() >= (product.deliveryFeeSettings.freeCondition || 0)) && (
            <div className={styles.paymentMethodContainer}>
              {product.deliveryFeeSettings.paymentMethods.map((method) => {
                const getPaymentDescription = (paymentMethod: string): string => {
                  switch (paymentMethod) {
                    case '선결제':
                      return '카드결제 시 상품금액과 함께 결제됩니다.'
                    case '착불':
                      return '상품 수령 후 기사님께 배송비를 결제해주세요.'
                    default:
                      return ''
                  }
                }

                return (
                  <div
                    key={method}
                    className={`${styles.paymentMethodBox} ${parcelPaymentMethod === method ? styles.paymentMethodBoxSelected : ''}`}
                    onClick={() => onParcelPaymentMethodChange?.(method)}
                  >
                    <div className={styles.paymentMethodContent}>
                      <span className={styles.paymentMethodName}>{method}</span>
                      <div className={styles.paymentMethodDescription}>{getPaymentDescription(method)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 결제 정보 */}
      <div className={styles.paymentSection}>
        <h3 className={styles.paymentTitle}>결제 정보</h3>
        <div className={styles.paymentRow}>
          <span>총 주문 개수</span>
          <span>{cartItems.reduce((total, item) => total + item.quantity, 0)}개</span>
        </div>
        <div className={styles.paymentTotal}>
          <span>총 결제금액</span>
          <span className={styles.totalPrice}>{calculateTotalPrice().toLocaleString()}원</span>
        </div>
        <div className={styles.buttonGroup}>
          <button
            className={styles.cartButton}
            onClick={onSaveToCart}
            disabled={!isOrderValid}
          >
            장바구니
          </button>
          <button
            className={styles.orderButton}
            onClick={onOrder}
            disabled={!isOrderValid}
          >
            주문하기
          </button>
        </div>
      </div>
    </div>
  )
}
