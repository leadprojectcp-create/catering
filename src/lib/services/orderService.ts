
export interface OrderItem {
  productId: string
  productName: string
  options: { [key: string]: string }
  quantity: number
  price: number
}

export interface Order {
  id?: string
  orderNumber?: string
  userId: string
  storeId: string
  storeName: string
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'accepted' | 'preparing' | 'completed' | 'cancelled'
  paymentMethod: string
  deliveryAddress: string
  phoneNumber: string
  requestNote?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

// 주문번호 생성 함수 (간단한 버전)
export const generateOrderNumber = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomStr = ''
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return `${dateStr}${randomStr}`
}

// Firebase 함수들은 실제 사용 시점에 별도로 구현
export const createOrder = async (orderData: Omit<Order, 'id'>): Promise<string> => {
  // 실제 구현은 사용하는 컴포넌트에서 처리
  console.log('createOrder called with:', orderData)
  return generateOrderNumber()
}

export const getOrder = async (orderId: string): Promise<Order | null> => {
  console.log('getOrder called with:', orderId)
  return null
}

export const updateOrderStatus = async (
  orderId: string,
  status: Order['status']
): Promise<void> => {
  console.log('updateOrderStatus called:', orderId, status)
}

export const getStoreOrders = async (storeId: string): Promise<Order[]> => {
  console.log('getStoreOrders called with:', storeId)
  return []
}

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  console.log('getUserOrders called with:', userId)
  return []
}