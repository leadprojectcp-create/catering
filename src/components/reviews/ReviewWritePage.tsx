'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Loading from '@/components/Loading'
import styles from './ReviewWritePage.module.css'

interface OrderItem {
  productId: string
  productName: string
  options: { [key: string]: string }
  quantity: number
  price: number
}

interface Order {
  id: string
  storeId: string
  storeName: string
  items: OrderItem[]
  orderStatus: string
}

export default function ReviewWritePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<Order | null>(null)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const loadOrder = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      if (!orderId) {
        alert('주문 정보가 없습니다.')
        router.push('/orders')
        return
      }

      try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId))

        if (!orderDoc.exists()) {
          alert('주문을 찾을 수 없습니다.')
          router.push('/orders')
          return
        }

        const orderData = orderDoc.data()

        if (orderData.userId !== user.uid) {
          alert('권한이 없습니다.')
          router.push('/orders')
          return
        }

        if (orderData.orderStatus !== 'delivered') {
          alert('배송완료된 주문만 리뷰를 작성할 수 있습니다.')
          router.push('/orders')
          return
        }

        setOrder({
          id: orderDoc.id,
          storeId: orderData.storeId,
          storeName: orderData.storeName,
          items: orderData.items,
          orderStatus: orderData.orderStatus,
        })
      } catch (error) {
        console.error('주문 로딩 실패:', error)
        alert('주문 정보를 불러오는데 실패했습니다.')
        router.push('/orders')
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [user, authLoading, orderId, router])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages = Array.from(files)

    // 최대 5개까지만 허용
    if (images.length + newImages.length > 5) {
      alert('이미지는 최대 5개까지 업로드 가능합니다.')
      return
    }

    // 각 파일 크기 체크 (10MB)
    const maxSize = 10 * 1024 * 1024
    for (const file of newImages) {
      if (file.size > maxSize) {
        alert('각 이미지는 10MB 이하여야 합니다.')
        return
      }
    }

    // 이미지 미리보기 생성
    const newPreviews: string[] = []
    newImages.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === newImages.length) {
          setImagePreviews([...imagePreviews, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })

    setImages([...images, ...newImages])
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const uploadImagesToBunny = async (reviewId: string): Promise<string[]> => {
    const uploadedUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const file = images[i]

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'review')
      formData.append('reviewId', reviewId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('이미지 업로드 실패')
      }

      const data = await response.json()
      uploadedUrls.push(data.url)
    }

    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !order) return

    if (content.trim().length < 10) {
      alert('리뷰 내용은 10자 이상 입력해주세요.')
      return
    }

    try {
      setSubmitting(true)

      // 먼저 리뷰 문서 생성
      const reviewRef = await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        orderId: order.id,
        storeId: order.storeId,
        storeName: order.storeName,
        productId: order.items[0]?.productId || '',
        rating,
        content: content.trim(),
        images: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // 이미지가 있으면 업로드
      if (images.length > 0) {
        setUploading(true)
        try {
          const imageUrls = await uploadImagesToBunny(reviewRef.id)

          // 리뷰 문서에 이미지 URL 추가
          await updateDoc(doc(db, 'reviews', reviewRef.id), {
            images: imageUrls,
            updatedAt: serverTimestamp(),
          })
        } catch (uploadError) {
          console.error('이미지 업로드 실패:', uploadError)
          alert('리뷰는 등록되었으나 일부 이미지 업로드에 실패했습니다.')
        } finally {
          setUploading(false)
        }
      }

      alert('리뷰가 등록되었습니다.')
      router.push('/orders')
    } catch (error) {
      console.error('리뷰 등록 실패:', error)
      alert('리뷰 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return <Loading />
  }

  if (!order) {
    return null
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>리뷰 작성</h1>

      <div className={styles.orderInfo}>
        <h2 className={styles.storeName}>{order.storeName}</h2>
        <div className={styles.items}>
          {order.items.map((item, index) => (
            <div key={index} className={styles.item}>
              {item.productName}
              {Object.entries(item.options).length > 0 && (
                <span className={styles.options}>
                  {' '}({Object.values(item.options).join(', ')})
                </span>
              )}
              <span className={styles.quantity}> x {item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>평점</label>
          <div className={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`${styles.star} ${star <= rating ? styles.starActive : ''}`}
                onClick={() => setRating(star)}
              >
                ★
              </button>
            ))}
            <span className={styles.ratingText}>{rating}점</span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>리뷰 내용 (최소 10자)</label>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="상품과 서비스에 대한 솔직한 평가를 남겨주세요."
            rows={8}
            required
            minLength={10}
          />
          <div className={styles.charCount}>{content.length}자</div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>사진 첨부 (선택, 최대 5장)</label>
          <div className={styles.imageUploadContainer}>
            <input
              type="file"
              id="imageInput"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className={styles.imageInput}
              disabled={images.length >= 5}
            />
            <label
              htmlFor="imageInput"
              className={`${styles.imageUploadButton} ${images.length >= 5 ? styles.disabled : ''}`}
            >
              <span className={styles.uploadIcon}>📷</span>
              <span>사진 추가 ({images.length}/5)</span>
            </label>
          </div>

          {imagePreviews.length > 0 && (
            <div className={styles.imagePreviewContainer}>
              {imagePreviews.map((preview, index) => (
                <div key={index} className={styles.imagePreviewItem}>
                  <img src={preview} alt={`미리보기 ${index + 1}`} className={styles.previewImage} />
                  <button
                    type="button"
                    className={styles.removeImageButton}
                    onClick={() => removeImage(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push('/orders')}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting || uploading || content.trim().length < 10}
          >
            {uploading ? '이미지 업로드 중...' : submitting ? '등록 중...' : '리뷰 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
