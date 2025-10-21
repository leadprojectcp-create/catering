import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let adminApp: App | undefined
let adminDb: Firestore | undefined

export function getAdminApp(): App {
  if (adminApp) {
    return adminApp
  }

  // Firebase Admin SDK 초기화
  const apps = getApps()
  if (apps.length > 0) {
    adminApp = apps[0]
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase Admin SDK credentials are missing')
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${projectId}.firebaseio.com`,
    })
  }

  return adminApp
}

export function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb
  }

  const app = getAdminApp()
  adminDb = getFirestore(app)
  adminDb.settings({ databaseId: 'catering' })

  return adminDb
}
