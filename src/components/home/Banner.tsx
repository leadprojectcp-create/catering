'use client'

import { useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import { getActiveBanners, type Banner } from '@/lib/services/bannerService'
import OptimizedImage from '@/components/common/OptimizedImage'
import 'swiper/css'
import 'swiper/css/pagination'
import styles from './Banner.module.css'

export default function Banner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentIndex, setCurrentIndex] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      setLoading(true)
      const data = await getActiveBanners()
      setBanners(data)
    } catch (error) {
      console.error('배너 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSlideChange = (swiper: SwiperType) => {
    setCurrentIndex(swiper.realIndex + 1)
  }

  const handleBannerClick = (linkUrl?: string) => {
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading || banners.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.bannerWrapper}>
        <Swiper
          modules={[Autoplay]}
          slidesPerView={2}
          spaceBetween={16}
          loop={true}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            reverseDirection: false
          }}
          onSlideChange={handleSlideChange}
          className={styles.swiper}
          breakpoints={{
            0: {
              slidesPerView: 1,
              spaceBetween: 12
            },
            768: {
              slidesPerView: 2,
              spaceBetween: 16
            }
          }}
        >
          {banners.map((banner) => (
            <SwiperSlide key={banner.id}>
              <div
                className={styles.bannerCard}
                onClick={() => handleBannerClick(banner.linkUrl)}
              >
                {banner.imageUrl && (
                  <OptimizedImage
                    src={banner.imageUrl}
                    alt={banner.title}
                    className={styles.bannerImage}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 640px"
                    quality={75}
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className={styles.paginationWrapper}>
        <div className={styles.customPagination}>
          {banners.map((_, index) => (
            <div
              key={index}
              className={`${styles.paginationBullet} ${
                index + 1 === currentIndex ? styles.paginationBulletActive : ''
              }`}
            />
          ))}
        </div>
        <div className={styles.counter}>
          <span className={styles.currentNumber}>
            {String(currentIndex).padStart(2, '0')}
          </span>
          <span className={styles.totalNumber}>
            /{String(banners.length).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  )
}
