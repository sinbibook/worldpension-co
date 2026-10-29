/* ============================================================
   pages/index.js — 메인 페이지 스크립트
   슬라이드는 index-mapper 가 동적 생성하므로, 매핑 완료 후
   window.initIndexSwipers() 를 호출받아 초기화한다.
   (원본 custom.js 는 Swiper 3 API 였으나 Swiper 8 기준으로 재작성)
   ============================================================ */
window.initIndexSwipers = function () {
  if (typeof Swiper === 'undefined' || !window.TplSwiper) return;

  // 메인 비주얼 (풀스크린 페이드)
  window.TplSwiper.init('indexVisual', '.main_visual_box .swiper-container', {
    loop: true,
    spaceBetween: 0,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    autoplay: { delay: 4000, disableOnInteraction: false },
    navigation: {
      nextEl: '.main_visual .arw_right',
      prevEl: '.main_visual .arw_left'
    }
  });

  // 객실 미리보기 (3 → 2 → 1)
  window.TplSwiper.init('indexRoom', '.main_room .swiper-container_special', {
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

  // Healing Place (외부 전경 페이드)
  window.TplSwiper.init('indexLandscape', '.main_landscape .swiper-container_room', {
    loop: true,
    spaceBetween: 0,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    autoplay: { delay: 4000, disableOnInteraction: false }
  });
};
