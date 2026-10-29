(function (global) {
  'use strict';

  function LayoutMapMapper() {
    BaseDataMapper.call(this);
  }
  LayoutMapMapper.prototype = Object.create(BaseDataMapper.prototype);
  LayoutMapMapper.prototype.constructor = LayoutMapMapper;

  LayoutMapMapper.prototype.mapPage = function () {
    var section = this.getSection();

    // enabled=false (또는 섹션 자체가 없음) → 404 리다이렉트.
    // 헤더의 "미리보기" li 숨김과 대메뉴 ROOMS 이동처(첫 객실 상세)도
    // header-footer-mapper 가 같은 기준(isLayoutMapEnabled)으로 정한다.
    if (!this.isLayoutMapEnabled()) {
      window.location.href = '404.html';
      return;
    }

    this.mapPropertyNames();
    this.mapHeroBg(section);
    this.renderRoomNav('[data-room-list-nav]', null);
    this.renderRoomSlides('[data-room-list-slides]');
    this.mapLayoutImage(section);

    if (typeof window.initLayoutMapSwipers === 'function') window.initLayoutMapSwipers();
  };

  // layoutMap 페이지 섹션 (customFields.pages.layoutMap.sections[0])
  LayoutMapMapper.prototype.getSection = function () {
    var page = this.getPages().layoutMap;
    return (page && page.sections && page.sections[0]) || null;
  };

  // MAPPER: customFields.property.propertyUnameEn / property.nameEn / property.name + [data-property-caption]
  LayoutMapMapper.prototype.mapPropertyNames = function () {
    var nameEn = this.getPropertyNameEn();
    var name = this.getPropertyName();
    document.querySelectorAll('[data-property-name-en]').forEach(function (el) {
      el.textContent = nameEn;
    });
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });
    this.applyPropertyCaptions();
  };

  // MAPPER: layoutMap.hero.images[isSelected][0] → [data-layout-map-hero-bg]
  // 없으면 property.images[0].thumbnail 로 폴백한다.
  LayoutMapMapper.prototype.mapHeroBg = function (section) {
    var hero = (section && section.hero) || {};
    var url = this.getFirstSelectedImage(hero.images || []);

    if (!url) {
      var propImages = this.getProperty().images || [];
      var thumbs = (propImages[0] && propImages[0].thumbnail) || [];
      url = this.getFirstSelectedImage(thumbs) || (thumbs[0] && thumbs[0].url) || '';
    }

    var self = this;
    document.querySelectorAll('[data-layout-map-hero-bg]').forEach(function (el) {
      self.setBackground(el, url, '객실 미리보기 대표 이미지');
    });
  };

  // MAPPER: layoutMap.about.images[isSelected] → [data-layout-map-image]
  // 배치도 이미지가 없으면 영역을 통째로 숨긴다 (빈 회색 박스 방지).
  LayoutMapMapper.prototype.mapLayoutImage = function (section) {
    var about = (section && section.about) || {};
    // about 이 배열로 오는 경우도 있어 둘 다 받는다
    var images = Array.isArray(about) ? (about[0] && about[0].images) || [] : about.images || [];
    var selectedImages = this.getSelectedImages(images).filter(function (image) {
      return image && image.url;
    });
    var targets = document.querySelectorAll('[data-layout-map-image]');

    var wrap = document.querySelector('[data-layout-map-wrap]');
    if (!selectedImages.length) {
      if (wrap) wrap.style.display = 'none';
      return;
    }
    if (wrap) wrap.style.display = '';

    // 배치도는 도면이라 잘리면 안 된다. background(cover) 가 아니라 <img> 로 넣어
    // 원본 비율 그대로 전체가 보이게 한다. 선택 이미지가 여러 장이면 모두 노출한다.
    targets.forEach(function (el) {
      var parent = el.parentNode;
      if (!parent) return;
      parent.innerHTML = '';

      selectedImages.forEach(function (image, index) {
        var img = document.createElement('img');
        img.src = image.url;
        img.alt = image.description || '배치도' + (index > 0 ? ' ' + (index + 1) : '');
        img.setAttribute('data-layout-map-image', '');
        parent.appendChild(img);
      });
    });

    if (!targets.length) {
      document.querySelectorAll('.layout_map_wide').forEach(function (el) {
        el.innerHTML = '';
        selectedImages.forEach(function (image, index) {
          var img = document.createElement('img');
          img.src = image.url;
          img.alt = image.description || '배치도' + (index > 0 ? ' ' + (index + 1) : '');
          img.setAttribute('data-layout-map-image', '');
          el.appendChild(img);
        });
      });
    }
  };

  // preview-handler 가 standalone/preview 양쪽 초기화를 담당한다
  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new LayoutMapMapper();
    mapper.initialize();
    global.layoutMapMapperInstance = mapper;
  });

  global.LayoutMapMapper = LayoutMapMapper;
})(window);
