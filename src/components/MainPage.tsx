'use client'

import Header from './Header'
import Footer from './Footer'

export default function MainPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">
            밀랩에서 시작하는 단체주문
          </h1>
          <p className="text-lg text-gray-600 mb-12">
            떡, 전통한과부터 케이터링까지<br />
            모든 단체주문을 한 곳에서 해결하세요
          </p>

          {/* 주요 카테고리 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="font-semibold text-gray-800">전체</h3>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🍘</div>
              <h3 className="font-semibold text-gray-800">떡 / 전통한과 / 견과류</h3>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">☕</div>
              <h3 className="font-semibold text-gray-800">음료 / 커피 / 차</h3>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🍫</div>
              <h3 className="font-semibold text-gray-800">초콜릿 / 사탕</h3>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🍎</div>
              <h3 className="font-semibold text-gray-800">과일 도시락</h3>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🍱</div>
              <h3 className="font-semibold text-gray-800">김밥 / 컵밥류</h3>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🥗</div>
              <h3 className="font-semibold text-gray-800">샐러드 도시락</h3>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🧈</div>
              <h3 className="font-semibold text-gray-800">브런치 박스</h3>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🥪</div>
              <h3 className="font-semibold text-gray-800">샌드위치 / 베이커리</h3>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="font-semibold text-gray-800">케이터링 박스 / 플래터</h3>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}