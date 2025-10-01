'use client'

import { useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import 'swiper/css/pagination'
import styles from './Banner.module.css'

const banners = [
  {
    id: 1,
    title: '특별 할인 이벤트',
    description: '신규 가입 시 최대 30% 할인 혜택',
    backgroundColor: '#FF6B6B'
  },
  {
    id: 2,
    title: '당일 배송 서비스',
    description: '오늘 주문하면 오늘 받는 빠른 배송',
    backgroundColor: '#4ECDC4'
  },
  {
    id: 3,
    title: '단체 주문 할인',
    description: '100인분 이상 주문 시 특별 가격 제공',
    backgroundColor: '#45B7D1'
  },
  {
    id: 4,
    title: '신메뉴 출시',
    description: '프리미엄 디저트 박스 새롭게 출시',
    backgroundColor: '#96CEB4'
  },
  {
    id: 5,
    title: 'AI 맞춤 추천',
    description: '우리 모임에 딱 맞는 메뉴 찾기',
    backgroundColor: '#FFEAA7'
  }
]

export default function Banner() {
  const [currentIndex, setCurrentIndex] = useState(1)

  const handleSlideChange = (swiper: SwiperType) => {
    setCurrentIndex(swiper.realIndex + 1)
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
                style={{ backgroundColor: banner.backgroundColor }}
              >
                <h3 className={styles.bannerTitle}>{banner.title}</h3>
                <p className={styles.bannerDescription}>{banner.description}</p>
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
