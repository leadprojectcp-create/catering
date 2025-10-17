import { Timestamp, FieldValue } from 'firebase/firestore'

export type NoticeTargetType = 'all' | 'partner' | 'user'

export interface Notice {
  id?: string
  title: string
  content: string
  targetType: NoticeTargetType
  author: string
  authorId: string
  status: 'draft' | 'published'
  viewCount?: number
  createdAt?: Date | Timestamp | FieldValue
  updatedAt?: Date | Timestamp | FieldValue
  publishedAt?: Date | Timestamp | FieldValue | null
}
