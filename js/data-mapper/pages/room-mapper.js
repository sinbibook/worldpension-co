(function (global) {
  'use strict';

  function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  function RoomMapper() {
    BaseDataMapper.call(this);
  }
  RoomMapper.prototype = Object.create(BaseDataMapper.prototype);
  RoomMapper.prototype.constructor = RoomMapper;

  RoomMapper.prototype.mapPage = function () {
    var roomtype = this.getCurrentRoomtype();
    var room = roomtype ? this.findRoomById(roomtype.id) : null;
    // roomtype_interior = 히어로 슬라이더. 조각컷(배너·패럴랙스·와이드)은 컨셉 및 외경 우선 (mapBanners)
    var interiors = roomtype ? this.getRoomtypeImages(roomtype, 'roomtype_interior') : [];

    this.mapPropertyNames();
    this.mapRoomInfo(roomtype, room);
    this.mapHeroSlides(roomtype, interiors);
    this.renderRoomNav('[data-room-list-nav]', roomtype && roomtype.id);
    this.mapBookingUrl();
    this.mapBanners(roomtype, interiors);
    this.mapFloorplan(roomtype);
    // 하단 "Room's Preview" 슬라이더 (index / layout-map 과 동일 마크업)
    this.renderRoomSlides('[data-room-list-slides]');
    this.mapClosingText();

    if (typeof window.initRoomSwipers === 'function') window.initRoomSwipers();
    if (typeof window.initParallax === 'function') window.initParallax();
  };

  // 현재 객실타입: URL ?room_id= (preview 는 ?id= 호환), 없으면 첫 번째
  RoomMapper.prototype.getCurrentRoomtype = function () {
    var roomtypes = this.getRoomtypes();
    if (!roomtypes.length) return null;

    var params = new URLSearchParams(window.location.search);
    var id = params.get('room_id') || params.get('id');
    if (!id) return roomtypes[0];

    var matched = roomtypes.filter(function (rt) {
      return String(rt.id) === String(id);
    })[0];
    return matched || roomtypes[0];
  };

  // MAPPER: customFields.property.propertyUnameEn / property.nameEn / property.name + [data-property-caption]
  RoomMapper.prototype.mapPropertyNames = function () {
    setAllText('[data-property-name-en]', this.getPropertyNameEn());
    setAllText('[data-property-name]', this.getPropertyName());
    this.applyPropertyCaptions();
  };

  // MAPPER: 객실명 / 인원 / 유형 / 평형 / 집기품목 (PC + 모바일 표 양쪽)
  RoomMapper.prototype.mapRoomInfo = function (roomtype, room) {
    setAllText('[data-room-name]', this.getRoomtypeName(roomtype));
    setAllText('[data-room-structure]', this.formatRoomStructure(room));
    setAllText('[data-room-base-occupancy]', (room && room.baseOccupancy) || '');
    setAllText('[data-room-max-occupancy]', (room && room.maxOccupancy) || '');
    // rooms[].size 는 ㎡ → 평 환산해 노출한다
    setAllText('[data-room-size-pyeong]', this.toPyeong(room && room.size));

    var amenities = (room && room.amenities) || [];
    setAllText('[data-room-amenities]', amenities.join(', '));
  };

  // MAPPER: roomtypes[current] interior 전체 → [data-room-hero-slides] (배경 슬라이드)
  // ⚠️ 히어로만 sortOrder 순으로 정렬한다.
  //    interior 의 배열 순서는 교차 배너/패럴랙스/와이드 슬롯 배분용이고(원본이 슬롯마다
  //    고른 사진을 그 순서로 담고 있다), 히어로 슬라이더는 원본에서 sortOrder 순이다.
  RoomMapper.prototype.mapHeroSlides = function (roomtype, interiors) {
    var self = this;
    var images = this.sortRoomtypeImages(interiors);

    // interior 가 없으면 thumbnail 로 폴백
    if (!images.length && roomtype) {
      images = this.sortRoomtypeImages(this.getRoomtypeImages(roomtype, 'roomtype_thumbnail'));
    }

    var wrapper = document.querySelector('[data-room-hero-slides]');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    if (!images.length) {
      var empty = document.createElement('div');
      empty.className = 'swiper-slide';
      ImageHelpers.applyBackgroundPlaceholder(empty, '객실 이미지');
      wrapper.appendChild(empty);
      return;
    }

    images.forEach(function (img) {
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      self.setBackground(slide, img.url, '객실 이미지');
      wrapper.appendChild(slide);
    });
  };

  // MAPPER: property.realtimeBookingId → [data-booking-url]
  RoomMapper.prototype.mapBookingUrl = function () {
    var url = this.getBookingUrl();
    document.querySelectorAll('[data-booking-url]').forEach(function (el) {
      if (url && url !== '#!') {
        el.href = url;
        el.setAttribute('target', '_blank');
      }
    });
  };

  // 고정 슬롯(li 2개 / 와이드 1장)에 이미지를 순서대로 채운다.
  // 이미지가 모자라면 앞에서부터 순환해 빈 칸을 남기지 않는다.
  RoomMapper.prototype.fillSlots = function (selector, images, offset, label) {
    var self = this;
    document.querySelectorAll(selector).forEach(function (container) {
      var slots = container.classList.contains('img')
        ? [container]
        : Array.prototype.slice.call(container.children);

      slots.forEach(function (slot, i) {
        var pool = images.slice(offset).concat(images);
        self.setBackground(slot, pool[i] ? pool[i].url : '', label);
      });
    });
  };

  /**
   * 슬롯 마커로 이미지를 고른다 — description 이 `room_bnr1:0` 같은 꼴이다.
   *
   * ⚠️ 배열 위치로 고르면 안 된다. 어드민이 이미지 배열을 화면 상태로 재조립할 때
   *    순서가 sortOrder 기준으로 바뀌어, 히어로(sortOrder 로 그림)만 맞고 슬롯이 깨진다.
   *    마커가 없는 예전 데이터는 호출부에서 배열 위치로 폴백한다.
   */
  RoomMapper.prototype.pickSlot = function (images, mark) {
    var prefix = mark + ':';
    return (images || [])
      .filter(function (img) {
        return img && typeof img.description === 'string' && img.description.indexOf(prefix) === 0;
      })
      .sort(function (a, b) {
        return (
          parseInt(a.description.slice(prefix.length), 10) -
          parseInt(b.description.slice(prefix.length), 10)
        );
      });
  };

  // 이미지 설명이 자리 표시(room_bnr1:0 등)면 문구가 아니다. 배너 문구로 찍히던 것을 막는다.
  var SLOT_MARK_RE = /^room_(bnr1|bnr2|parallax|wide):\d+$/;

  // MAPPER: 조각컷 배분 — 교차 배너 2장 / 패럴랙스 1장 / 배너2 2장 / 와이드 1장
  // 소스: 객실 설정 "컨셉 및 외경"(roomtype_exterior) → 비면 내부 이미지(예전 크롤·직접 만든 객실).
  //   컨셉 및 외경은 순서(sortOrder)가 곧 자리다: 1·2 배너1 / 3 패럴랙스 / 4·5 배너2 / 6 와이드.
  //   크롤러가 넣은 사진에는 자리 표시도 있어 표시가 우선이다. 모자라면 앞에서부터 돌려 쓴다.
  // 히어로 슬라이더 · 목록 썸네일은 그대로 내부 이미지다.
  RoomMapper.prototype.mapBanners = function (roomtype, interiors) {
    var self = this;
    var images = interiors.slice();
    var cuts = roomtype
      ? this.sortRoomtypeImages(this.getRoomtypeImages(roomtype, 'roomtype_exterior'))
      : [];

    if (!images.length && roomtype) {
      images = this.getRoomtypeImages(roomtype, 'roomtype_thumbnail');
    }
    var pool = cuts.length ? cuts : images;

    // 원본이 슬롯마다 고른 사진 (객실마다 다르다). 없으면 배열 위치로 폴백한다.
    var bnr1 = this.pickSlot(pool, 'room_bnr1');
    var bnr2 = this.pickSlot(pool, 'room_bnr2');
    var parallax = this.pickSlot(pool, 'room_parallax')[0];
    var wide = this.pickSlot(pool, 'room_wide')[0];

    // 교차 배너 #1 — 마커 우선, 없으면 앞 2장 (원본 레이아웃이 li 2개 고정)
    this.fillSlots('[data-room-bnr-images]', bnr1.length ? bnr1 : pool, 0, '객실 이미지');

    // 배너 문구는 숙소 영문명 고정이다 (원본 room.html 과 동일).
    // 객실명을 넣지 않는다 — 객실명은 히어로 아래 .sub_title2 h3 에서 이미 크게 노출된다.
    var propNameEn = this.getPropertyNameEn();
    setAllText('[data-room-bnr-title]', propNameEn);

    var desc = this.cleanText(images[0] && images[0].description);
    if (SLOT_MARK_RE.test(desc)) desc = '';
    document.querySelectorAll('[data-room-bnr-description]').forEach(function (el) {
      // 폴백 문구는 <br> 를 포함한 HTML 이라 이스케이프하지 않는다
      el.innerHTML = desc ? self.nl2br(desc) : self.BNR_FALLBACK_DESC_HTML;
    });

    // 패럴랙스 밴드 — 마커 → [2] → [0]
    var parallaxUrl =
      (parallax && parallax.url) || (pool[2] && pool[2].url) || (pool[0] && pool[0].url) || '';
    document.querySelectorAll('[data-room-parallax]').forEach(function (el) {
      if (parallaxUrl) {
        // ⚠️ background-image 를 직접 주지 않는다 (.parallax-mirror 가 z-index:-100)
        el.setAttribute('data-image-src', parallaxUrl);
      } else {
        ImageHelpers.applyBackgroundPlaceholder(el, '객실 이미지');
      }
    });

    // 와이드 이미지 하단 문구 — 원본 카피 "Hello, {nameEn}"
    setAllText('[data-room-hello-title]', propNameEn ? 'Hello, ' + propNameEn : '');

    // 교차 배너 #2 — 마커 우선, 없으면 [3..]
    this.fillSlots('[data-room-gallery]', bnr2.length ? bnr2 : pool, bnr2.length ? 0 : 3, '객실 이미지');
    // 와이드 — 마커 → [5] → [1]
    document.querySelectorAll('[data-room-wide-image]').forEach(function (el) {
      var url = (wide && wide.url) || (pool[5] && pool[5].url) || (pool[1] && pool[1].url) || '';
      self.setBackground(el, url, '객실 이미지');
    });
  };

  // MAPPER: roomtypes[current] 평면도 크롤링 이미지 → [data-room-floorplan-image]
  // 이미지가 없으면 평면도 섹션 전체 미노출.
  RoomMapper.prototype.mapFloorplan = function (roomtype) {
    var section = document.querySelector('[data-room-floorplan-section]');
    if (!section) return;

    var imgEl = section.querySelector('[data-room-floorplan-image]');
    var image = this.getRoomFloorplanImage(roomtype);
    if (!image || !image.url) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    if (imgEl) {
      imgEl.src = image.url;
      imgEl.alt = this.cleanText(image.description) || '객실 평면도';
    }
  };

  // MAPPER: 패럴랙스 밴드 문구 — index.closing 공유 (index / main 과 동일 규칙)
  RoomMapper.prototype.mapClosingText = function () {
    var indexPage = this.getPages().index;
    var closing =
      (indexPage && indexPage.sections && indexPage.sections[0] && indexPage.sections[0].closing) ||
      {};

    var nameEn = this.cleanText(this.getPropertyNameEn());
    setAllText(
      '[data-index-closing-title]',
      this.firstText(closing.title, nameEn ? 'Welcome to ' + nameEn : '')
    );

    var desc = this.cleanText(closing.description);
    document.querySelectorAll('[data-index-closing-description]').forEach(
      function (el) {
        el.innerHTML = desc ? this.nl2br(desc) : this.CLOSING_FALLBACK_DESC_HTML;
      }.bind(this)
    );
  };

  // preview-handler 가 standalone/preview 양쪽 초기화를 담당한다
  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new RoomMapper();
    mapper.initialize();
    global.roomMapperInstance = mapper;
  });

  global.RoomMapper = RoomMapper;
})(window);
