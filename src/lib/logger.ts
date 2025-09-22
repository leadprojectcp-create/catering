import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface LogActivityParams {
  restaurantId: string
  restaurantName: string
  actionType: 'phone_call' | 'website_visit'
  additionalData?: Record<string, any>
}

export const logActivity = async ({
  restaurantId,
  restaurantName,
  actionType,
  additionalData = {}
}: LogActivityParams) => {
  try {
    const logData = {
      restaurantId,
      restaurantName,
      actionType,
      timestamp: new Date(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      ...additionalData
    }

    await addDoc(collection(db, 'activity_logs'), logData)
    console.log('Activity logged:', actionType, restaurantName)
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

export const logPhoneCall = (restaurantId: string, restaurantName: string, phoneNumber: string) => {
  return logActivity({
    restaurantId,
    restaurantName,
    actionType: 'phone_call',
    additionalData: { phoneNumber }
  })
}

export const logWebsiteVisit = (restaurantId: string, restaurantName: string, websiteUrl: string) => {
  return logActivity({
    restaurantId,
    restaurantName,
    actionType: 'website_visit',
    additionalData: { websiteUrl }
  })
}