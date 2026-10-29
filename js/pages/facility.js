/* ============================================================
   pages/facility.js — 부대시설 페이지 스크립트
   슬라이드는 facility-mapper 가 동적 생성하므로, 매핑 완료 후
   window.initFacilitySwipers() 를 호출받아 초기화한다.
   ============================================================ */
window.initFacilitySwipers = function () {
  if (typeof Swiper === 'undefined' || !window.TplSwiper) return;

  // 부대시설 히어로 (풀와이드 페이드)
  window.TplSwiper.init('specialHero', '.sub_visual_box .swiper-container', {
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
};
