import { logEvent, setUserProperties, setUserId } from 'firebase/analytics'
import { analytics } from './firebase'

// Track page views
export const trackPageView = (pageName: string, pageTitle?: string) => {
  if (analytics) {
    logEvent(analytics, 'page_view', {
      page_title: pageTitle || pageName,
      page_location: window.location.href,
    })
  }
}

// Track custom events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (analytics) {
    logEvent(analytics, eventName, parameters)
  }
}

// Track user login
export const trackLogin = (method: string) => {
  if (analytics) {
    logEvent(analytics, 'login', {
      method: method
    })
  }
}

// Track user signup
export const trackSignup = (method: string) => {
  if (analytics) {
    logEvent(analytics, 'sign_up', {
      method: method
    })
  }
}

// Set user properties
export const setUserProperty = (properties: Record<string, string>) => {
  if (analytics) {
    setUserProperties(analytics, properties)
  }
}

// Set user ID
export const setAnalyticsUserId = (userId: string) => {
  if (analytics) {
    setUserId(analytics, userId)
  }
}

// Track restaurant view
export const trackRestaurantView = (restaurantId: string, restaurantName?: string) => {
  if (analytics) {
    logEvent(analytics, 'view_item', {
      item_id: restaurantId,
      item_name: restaurantName,
      item_category: 'restaurant'
    })
  }
}

// Track search
export const trackSearch = (searchTerm: string) => {
  if (analytics) {
    logEvent(analytics, 'search', {
      search_term: searchTerm
    })
  }
}