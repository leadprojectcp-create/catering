'use client'

import Image from 'next/image'
import { Product, CartItem, getOptionPrice, getAdditionalOptionPrice } from './ProductDetailPage'
import styles from './SelectedItems.module.css'

interface SelectedItemsProps {
  product: Product
  cartItems: CartItem[]
  storeRequest: string
  onRemoveItem: (index: number) => void
  onUpdateQuantity: (index: number, newQuantity: number) => void
  onQuantityInputChange: (index: number, value: string) => void
  onStoreRequestChange: (value: string) => void
  onSaveToCart: () => void
  onOrder: () => void
  calculateItemPrice: (options: { [key: string]: string }, qty: number, additionalOptions?: { [key: string]: string }) => number
  calculateTotalPrice: () => number
}

export default function SelectedItems({
  product,
  cartItems,
  storeRequest,
  onRemoveItem,
  onUpdateQuantity,
  onQuantityInputChange,
  onStoreRequestChange,
  onSaveToCart,
  onOrder,
  calculateItemPrice,
  calculateTotalPrice
}: SelectedItemsProps) {
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
                <Image
                  src="/icons/trash.svg"
                  alt="삭제"
                  width={16}
                  height={16}
                />
              </button>
            </div>
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
                type="number"
                value={item.quantity}
                onChange={(e) => onQuantityInputChange(index, e.target.value)}
                className={styles.quantityValue}
                min={product.minOrderQuantity || 1}
                max={product.maxOrderQuantity || 999}
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
      <div className={styles.requestSection}>
        <h3 className={styles.requestTitle}>매장 요청사항</h3>
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
          <button className={styles.cartButton} onClick={onSaveToCart}>
            장바구니
          </button>
          <button className={styles.orderButton} onClick={onOrder}>
            주문하기
          </button>
        </div>
      </div>
    </div>
  )
}
