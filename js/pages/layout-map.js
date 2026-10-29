/* ============================================================
   pages/layout-map.js — ROOMS 미리보기 페이지 스크립트
   슬라이드는 layout-map-mapper 가 동적 생성하므로, 매핑 완료 후
   window.initLayoutMapSwipers() 를 호출받아 초기화한다.
   ============================================================ */
window.initLayoutMapSwipers = function () {
  if (typeof Swiper === 'undefined' || !window.TplSwiper) return;

  // 객실 미리보기 (index.html 과 동일 설정)
  window.TplSwiper.init('layoutMapRoom', '.main_room .swiper-container_special', {
    loop: true,
    slidesPerView: 3,
    spaceBetween: 30,
    grabCursor: true,
    navigation: {
      nextEl: '.main_room .arw_right',
      prevEl: '.main_room .arw_left'
    },
    breakpoints: {
      0: { slidesPerView: 1, spaceBetween: 15 },
      480: { slidesPerView: 2, spaceBetween: 20 },
      961: { slidesPerView: 3, spaceBetween: 30 }
    }
  });
};
