/* ============================================================
   pages/main.js — 펜션소개(ABOUT) 페이지 스크립트
   페이지 내용은 원본 view.html(외경보기 / Landscape) 구조다.
   슬라이드는 main-mapper 가 동적 생성하므로, 매핑 완료 후
   window.initMainSwipers() 를 호출받아 초기화한다.
   ============================================================ */
window.initMainSwipers = function () {
  if (typeof Swiper === 'undefined' || !window.TplSwiper) return;

  // 히어로 (풀와이드 페이드)
  window.TplSwiper.init('mainHero', '.sub_visual_box .swiper-container', {
    loop: true,
    spaceBetween: 0,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    autoplay: { delay: 4000, disableOnInteraction: false },
    navigation: {
      nextEl: '.sub_visual_wide .arw_right',
      prevEl: '.sub_visual_wide .arw_left'
    }
  });

  // 외경 갤러리 (페이드 자동 재생)
  window.TplSwiper.init('mainLandscape', '.main_landscape .swiper-container_room', {
    loop: true,
    spaceBetween: 0,
    effect: 'fade',
    fadeEffect: { crossFade: true },
    autoplay: { delay: 4000, disableOnInteraction: false }
  });
};
