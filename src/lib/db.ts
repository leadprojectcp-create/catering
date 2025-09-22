import clientPromise from './mongodb'
import { ObjectId } from 'mongodb'

// 레스토랑 관련 함수들
export async function getRestaurants() {
  const client = await clientPromise
  const db = client.db('catering')
  const restaurants = await db.collection('restaurants').find({}).toArray()
  return restaurants
}

export async function getRestaurantById(id: string) {
  const client = await clientPromise
  const db = client.db('catering')
  const restaurant = await db.collection('restaurants').findOne({ id: parseInt(id) })
  return restaurant
}

// 주문 관련 함수들
export async function createOrder(orderData: any) {
  const client = await clientPromise
  const db = client.db('catering')
  const result = await db.collection('orders').insertOne({
    ...orderData,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  return result
}

export async function getOrdersByUser(userId: string) {
  const client = await clientPromise
  const db = client.db('catering')
  const orders = await db.collection('orders').find({ userId }).toArray()
  return orders
}

export async function getOrderById(orderId: string) {
  const client = await clientPromise
  const db = client.db('catering')
  const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) })
  return order
}