import prettierConfig from 'eslint-config-prettier';

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  Promise: 'readonly',
  fetch: 'readonly',
  Event: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  location: 'readonly',
  getComputedStyle: 'readonly',
  navigator: 'readonly',
  requestAnimationFrame: 'readonly',
  module: 'writable',
};

const projectGlobals = {
  kakao: 'readonly',
  jQuery: 'readonly',
  $: 'readonly',
  Swiper: 'readonly',
  BaseDataMapper: 'writable',
  ImageHelpers: 'readonly',
  HeaderFooterMapper: 'readonly',
  IndexMapper: 'readonly',
  MainMapper: 'readonly',
  RoomMapper: 'readonly',
  FacilityMapper: 'readonly',
  ReservationMapper: 'readonly',
  DirectionsMapper: 'readonly',
  NearbyAttractionsMapper: 'readonly',
  LayoutMapMapper: 'readonly',
  LandingMapper: 'readonly',
  PopupManager: 'writable',
};

export default [
  {
    // 서드파티 벤더 라이브러리는 원본 유지 (lint 제외)
    ignores: ['js/parallax.js'],
  },
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        ...browserGlobals,
        ...projectGlobals,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
      eqeqeq: ['warn', 'always'],
      'no-var': 'off',
    },
  },
  prettierConfig,
];
