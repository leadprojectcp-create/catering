export interface OrderItem {
  options: { [key: string]: string }
  optionsWithPrices?: { [key: string]: { name: string; price: number } }
  quantity: number
  price?: number
  itemPrice?: number
}

export interface OrderData {
  storeId: string
  storeName: string
  productId: string
  productName: string
  productPrice: number
  productImage: string
  items: OrderItem[]
  deliveryMethods?: string[]
  totalPrice?: number
}

export interface DeliveryAddress {
  id: string
  name: string
  orderer: string
  phone: string
  email: string
  address: string
  detailAddress?: string
  deliveryDate: string
  deliveryTime: string
  request: string
}
