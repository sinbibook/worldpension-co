(function (global) {
  'use strict';

  function BaseDataMapper() {
    this.data = null;
    this.isDataLoaded = false;
  }

  BaseDataMapper.prototype.initialize = function () {
    var self = this;
    var url = 'standard-template-data.json?t=' + Date.now();
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load standard-template-data.json');
        return res.json();
      })
      .then(function (json) {
        self.data = json;
        self.isDataLoaded = true;
        self.mapPage();
        if (window.__tplReveal) window.__tplReveal(); // 매핑 완료 → 화면 노출(페이드인)
      })
      .catch(function (err) {
        console.error('[BaseDataMapper] initialize error:', err);
        if (window.__tplReveal) window.__tplReveal(); // 실패해도 화면은 노출
      });
  };

  BaseDataMapper.prototype.mapPage = function () {};

  BaseDataMapper.prototype.updateData = function (newData) {
    this.data = newData;
    this.isDataLoaded = true;
    this.mapPage();
    if (window.__tplReveal) window.__tplReveal(); // 매핑 완료 → 화면 노출(페이드인)
  };

  // ── 데이터 접근 헬퍼 ──────────────────────────────────────
  BaseDataMapper.prototype.getProperty = function () {
    return (this.data && this.data.property) || {};
  };

  BaseDataMapper.prototype.getHomepage = function () {
    return (this.data && this.data.homepage) || {};
  };

  BaseDataMapper.prototype.getCustomFields = function () {
    return this.getHomepage().customFields || {};
  };

  // customFields.roomtypes (localhost / preview 경로 모두 대응)
  // 객실 목록의 단일 소스. rooms[] 는 roomtypes[i].id === rooms[j].id 매칭으로
  // 인원/평형/집기 등 상세값을 조회할 때만 쓴다.
  BaseDataMapper.prototype.getRoomtypes = function () {
    var cf = this.getCustomFields();
    if (cf.roomtypes && cf.roomtypes.length) return cf.roomtypes;
    if (this.data && this.data.customFields && this.data.customFields.roomtypes) {
      return this.data.customFields.roomtypes;
    }
    return cf.roomtypes || [];
  };

  BaseDataMapper.prototype.getPages = function () {
    // localhost 경로: this.data.homepage.customFields.pages
    var pagesFromHomepage = this.getCustomFields().pages;
    if (pagesFromHomepage && Object.keys(pagesFromHomepage).length > 0) {
      return pagesFromHomepage;
    }

    // preview 경로: this.data.customFields.pages
    if (this.data && this.data.customFields && this.data.customFields.pages) {
      return this.data.customFields.pages;
    }

    return {};
  };

  // customFields.property.name 우선, 없으면 property.name
  BaseDataMapper.prototype.getPropertyName = function () {
    var cf = this.getCustomFields();
    if (cf.property && cf.property.name) return cf.property.name;
    return this.getProperty().name || '';
  };

  // customFields.property 영문명 우선, 없으면 property.nameEn
  BaseDataMapper.prototype.getPropertyNameEn = function () {
    var cf = this.getCustomFields();
    var cfProperty = cf.property || {};
    return this.firstText(
      cfProperty.propertyUnameEn,
      cfProperty.propertyunameen,
      cfProperty.propertyNameEn,
      cfProperty.propertynameen,
      cfProperty.nameEn,
      this.getProperty().nameEn
    );
  };

  // homepage.images[0].logo 중 isSelected인 URL
  BaseDataMapper.prototype.getLogo = function () {
    var hp = this.getHomepage();
    var images = hp.images;
    if (!images || !images[0] || !images[0].logo) return '';
    var logos = images[0].logo;
    var selected = logos.find(function (l) {
      return l.isSelected;
    });
    return selected ? selected.url : logos[0] ? logos[0].url : '';
  };

  // property.realtimeBookingId
  // realtimeBookingId 는 "실시간예약링크" 같은 플레이스홀더/설명 문구가 그대로 들어올 수 있다.
  // 그걸 href 로 쓰면 상대경로로 해석돼 404 페이지가 새 탭으로 열리므로,
  // 실제 URL 로 보일 때만 링크로 취급하고 그 외에는 '#!'(비활성) 로 처리한다.
  BaseDataMapper.prototype.getBookingUrl = function () {
    var raw = this.getProperty().realtimeBookingId;
    if (typeof raw !== 'string') return '#!';

    var v = raw.trim();
    if (!v || v === '#!') return '#!';

    if (/^https?:\/\//i.test(v)) return v; // http(s)://...
    if (/^\/\//.test(v)) return 'https:' + v; // //도메인/...

    // 프로토콜 없이 도메인만 들어온 경우(booking.example.com/abc)는 https 를 붙여준다
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#]|$)/i.test(v)) return 'https://' + v;

    return '#!';
  };

  // ── 이미지 헬퍼 ──────────────────────────────────────────
  // isSelected=true인 이미지를 sortOrder 순으로 반환
  BaseDataMapper.prototype.getSelectedImages = function (images) {
    if (!images || !images.length) return [];
    return images
      .filter(function (img) {
        return img.isSelected;
      })
      .sort(function (a, b) {
        return a.sortOrder - b.sortOrder;
      });
  };

  // 첫 번째 isSelected 이미지의 URL
  BaseDataMapper.prototype.getFirstSelectedImage = function (images) {
    var list = this.getSelectedImages(images);
    return list.length ? list[0].url : '';
  };

  // 데이터 변환 (스네이크 케이스 → 카멜 케이스)
  BaseDataMapper.prototype.convertToCamelCase = function (obj) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertToCamelCase(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((result, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = this.convertToCamelCase(obj[key]);
        return result;
      }, {});
    }
    return obj;
  };

  // ── DOM 유틸 ────────────────────────────────────────────
  BaseDataMapper.prototype.setTextIfExist = function (selector, value) {
    var el = document.querySelector(selector);
    if (el && value !== undefined && value !== null) el.textContent = value;
  };

  BaseDataMapper.prototype.setAttrIfExist = function (selector, attr, value) {
    var el = document.querySelector(selector);
    if (el && value) el.setAttribute(attr, value);
  };

  BaseDataMapper.prototype.setAllAttr = function (selector, attr, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      if (value) el.setAttribute(attr, value);
    });
  };

  // ── 교차 배너(.sub_img_bnr) 공용 유틸 ─────────────────────
  // room / facility 두 페이지가 같은 마크업을 쓴다.
  // 설명 문구가 비어 올 때 쓰는 폴백 카피 — 원본 사이트의 공통 영문 카피.
  BaseDataMapper.prototype.BNR_FALLBACK_DESC_HTML =
    'Stay with your beloved companion <br>In a clean, cozy cabin. <br>Enjoy a happy moment with your companion.';

  // 원본 레이아웃이 li 2개 고정(좌 img+txt / 우 txt+img)이라 노출 이미지 수를 제한한다
  BaseDataMapper.prototype.BNR_MAX = 2;

  // 하단 와이드 배너(.main_pic) 설명 폴백 — 원본 사이트의 템플릿 기본 카피.
  // index.closing 을 index.html / main.html 이 공유하므로 여기에 둔다.
  // closing.description 에 값이 있으면 항상 그 값이 우선한다.
  BaseDataMapper.prototype.CLOSING_FALLBACK_DESC_HTML =
    'Stays with sea views in all rooms have crispy duvets and cute props. ' +
    '<br />There is also a panoramic sea view and sunshine every morning.';

  // 텍스트 이스케이프 + 줄바꿈(\n) → <br />
  BaseDataMapper.prototype.nl2br = function (text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />');
  };

  // ── 숙소명이 들어가는 문장 ───────────────────────────────
  // [data-property-caption="{name}의 객실을 소개합니다."] 처럼 템플릿 문자열을 속성에 두고
  // {name} / {nameEn} 을 치환한다.
  //
  // HTML 에 <span data-property-name></span>의 객실을… 형태로 두면
  // prettier(htmlWhitespaceSensitivity: ignore)가 인라인 텍스트를 줄바꿈하면서
  // 조사 앞에 공백이 끼어 "펜션 의 객실을" 로 렌더된다. 그래서 문장 전체를 매퍼가 조립한다.
  BaseDataMapper.prototype.applyPropertyCaptions = function () {
    var name = this.getPropertyName();
    var nameEn = this.cleanText(this.getProperty().nameEn);

    document.querySelectorAll('[data-property-caption]').forEach(function (el) {
      var tpl = el.getAttribute('data-property-caption') || '';
      el.innerHTML = tpl
        .replace(/\{name\}/g, name)
        .replace(/\{nameEn\}/g, nameEn)
        .replace(/\\n/g, '<br />');
    });
  };

  // ── 텍스트 정규화 ───────────────────────────────────────
  // 백오피스에서 빈 값이 공백 한 칸(' ')으로 내려오는 경우가 흔하다.
  // 그대로 두면 truthy 라서 폴백이 동작하지 않으므로, 공백만 있는 값은 '' 로 본다.
  BaseDataMapper.prototype.cleanText = function (value) {
    if (value === undefined || value === null) return '';
    var s = String(value).trim();
    return s;
  };

  // 앞에서부터 비어있지 않은 첫 값을 고른다 (폴백 체인)
  BaseDataMapper.prototype.firstText = function () {
    for (var i = 0; i < arguments.length; i++) {
      var s = this.cleanText(arguments[i]);
      if (s) return s;
    }
    return '';
  };

  // ── 객실 공용 유틸 ──────────────────────────────────────
  // index / layout-map / room 세 페이지가 같은 구조 문자열을 쓴다.

  // totalRoomCount 키 → 한글 라벨 (값이 1 이상인 항목만 나열)
  BaseDataMapper.prototype.ROOM_COUNT_LABELS = {
    bedroom: '침대룸',
    bathroom: '화장실',
    livingRoom: '거실',
    ondol: '온돌룸',
    kitchen: '주방'
  };

  // roomtypes[i].id === rooms[j].id 매칭으로 상세 객실 정보를 조회
  BaseDataMapper.prototype.findRoomById = function (id) {
    var rooms = (this.data && this.data.rooms) || [];
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i].id === id) return rooms[i];
    }
    return null;
  };

  // 객실명. roomtypes[i] 에 name 이 없는 응답이 흔하므로
  // 같은 id 의 rooms[j].name 으로 폴백한다 (동일 엔티티).
  BaseDataMapper.prototype.getRoomtypeName = function (roomtype) {
    if (!roomtype) return '';
    var room = this.findRoomById(roomtype.id);
    return this.firstText(roomtype.name, room && room.name);
  };

  // 객실 메뉴/미리보기 그룹 규칙.
  // roomtypes[].groupName 이 하나라도 있으면 groupName 을 메뉴명으로 쓰고,
  // 같은 그룹의 첫 번째 객실 id 로 상세 페이지에 진입한다.
  BaseDataMapper.prototype.getRoomGroupName = function (roomtype) {
    return this.firstText(roomtype && roomtype.groupName);
  };

  BaseDataMapper.prototype.hasRoomGroups = function (roomtypes) {
    var self = this;
    return (roomtypes || []).some(function (rt) {
      return !!self.getRoomGroupName(rt);
    });
  };

  BaseDataMapper.prototype.getRoomMenuItems = function () {
    var self = this;
    var roomtypes = this.getRoomtypes();
    if (!this.hasRoomGroups(roomtypes)) {
      return roomtypes.map(function (rt) {
        return { label: self.getRoomtypeName(rt), roomtype: rt, roomtypes: [rt] };
      });
    }

    var seen = {};
    var items = [];
    roomtypes.forEach(function (rt) {
      var groupName = self.getRoomGroupName(rt);
      // 그룹 숙소에서는 미그룹 객실을 메뉴에 내지 않는다.
      // 원본 헤더가 그룹만 노출하고, 미그룹 객실은 목록 / Room Preview 로만 도달한다.
      // (Room Preview 는 roomtypes[] 전체를 그리므로 영향 없다)
      if (!groupName) return;

      var label = groupName || self.getRoomtypeName(rt);
      if (!String(label).trim()) return;

      var key = groupName ? 'group:' + groupName : 'room:' + rt.id;
      if (!seen[key]) {
        seen[key] = { label: label, groupName: groupName, roomtype: rt, roomtypes: [rt] };
        items.push(seen[key]);
      } else {
        seen[key].roomtypes.push(rt);
      }
    });
    return this.sortRoomMenuItems(items);
  };

  // 메뉴 순서는 pages.room[] 배열 순서를 따른다 (크롤러 규약).
  //
  // ⚠️ 원본은 순서를 두 벌 갖는다 — 헤더 ROOMS 메뉴는 그룹 순서, 본문 Room's Preview 는
  //    카드 순서다. 미리보기는 roomtypes[] 순서로 그리므로, 메뉴까지 같은 배열에서
  //    파생하면 한쪽이 원본과 어긋난다. pages.room[] 은 어드민이 배열 순서 그대로
  //    보존하는 유일한 신호다 (roomtypes 는 5개 필드만 남기고 잘린다).
  //    pages.room 이 없으면 종전처럼 roomtypes 등장 순서를 쓴다.
  BaseDataMapper.prototype.sortRoomMenuItems = function (items) {
    var roomPages = (this.getPages().room || []);
    if (!roomPages.length || items.length < 2) return items;

    var rankById = {};
    roomPages.forEach(function (page, index) {
      if (page && page.id != null && rankById[page.id] === undefined) rankById[page.id] = index;
    });

    var rankOf = function (item) {
      var best = Infinity;
      (item.roomtypes || []).forEach(function (rt) {
        var at = rt && rankById[rt.id];
        if (at !== undefined && at < best) best = at;
      });
      return best;
    };

    return items
      .map(function (item, index) { return { item: item, index: index, rank: rankOf(item) }; })
      .sort(function (a, b) { return a.rank - b.rank || a.index - b.index; })
      .map(function (x) { return x.item; });
  };

  BaseDataMapper.prototype.getRoomMenuLabel = function (item) {
    return (item && item.label) || '';
  };

  BaseDataMapper.prototype.getRoomMenuRoomtype = function (item) {
    return (item && item.roomtype) || item;
  };

  BaseDataMapper.prototype.getRoomMenuLink = function (item) {
    var roomtype = this.getRoomMenuRoomtype(item);
    return './room.html?room_id=' + (roomtype && roomtype.id);
  };

  // ── 객실 미리보기(layout-map) 사용 여부 ──────────────────
  // layout-map.html 이 404 로 보내는 기준과 같아야 한다.
  // 섹션이 없거나 enabled=false 면 그 페이지는 열리지 않는다.
  BaseDataMapper.prototype.isLayoutMapEnabled = function () {
    var page = this.getPages().layoutMap;
    var section = page && page.sections && page.sections[0];
    return Boolean(section) && section.enabled !== false;
  };

  // 대메뉴 ROOMS 가 갈 곳.
  //   미리보기 켜짐 → layout-map.html (객실 배치도)
  //   미리보기 꺼짐 → 첫 번째 객실 상세 (헤더 객실 메뉴의 첫 항목과 같은 곳)
  // 객실이 하나도 없으면 갈 곳이 없으므로 null — 호출부가 원래 href 를 둔다.
  BaseDataMapper.prototype.getRoomsEntryLink = function () {
    if (this.isLayoutMapEnabled()) return './layout-map.html';
    var self = this;
    var link = null;
    this.getRoomMenuItems().some(function (item) {
      if (!String(self.getRoomMenuLabel(item)).trim()) return false;
      link = self.getRoomMenuLink(item);
      return true;
    });
    return link;
  };

  BaseDataMapper.prototype.isRoomMenuItemActive = function (item, currentId) {
    if (!item || !currentId) return false;
    return (item.roomtypes || []).some(function (rt) {
      return String(rt && rt.id) === String(currentId);
    });
  };

  // "원룸형/ 침대룸 화장실 주방" 형태의 구조 문자열
  BaseDataMapper.prototype.formatRoomStructure = function (room) {
    if (!room) return '';
    var labels = this.ROOM_COUNT_LABELS;
    var counts = room.totalRoomCount || {};
    var parts = Object.keys(labels)
      .filter(function (key) {
        return Number(counts[key]) >= 1;
      })
      .map(function (key) {
        return labels[key];
      });

    var structure = (room.roomStructures && room.roomStructures[0]) || '';
    if (!structure && !parts.length) return '';
    if (!parts.length) return structure;
    if (!structure) return parts.join(' ');
    return structure + '/ ' + parts.join(' ');
  };

  // rooms[].size 는 제곱미터(㎡). 화면에는 평으로 환산해 노출한다.
  // 1평 = 3.305785㎡, 소수 1자리. 예) 62.81㎡ → "19평"
  BaseDataMapper.prototype.toPyeong = function (sqm) {
    var n = Number(sqm);
    if (!n || isNaN(n)) return '';
    return Math.round((n / 3.305785) * 10) / 10 + '평';
  };

  // roomtypes[i].images 중 특정 category 만 isSelected 필터해 **배열 순서 그대로** 반환한다.
  // category 예) 'roomtype_thumbnail' | 'roomtype_interior' | 'roomtype_exterior'
  //
  // ⚠️ sortOrder 로 정렬하지 않는다. roomtype_interior 는 배열 순서와 sortOrder 가 다른 뜻이다.
  //    배열 순서 = room.html 의 교차 배너 / 패럴랙스 / 와이드 슬롯 배분 순서
  //    sortOrder = 히어로 슬라이더 노출 순서
  //    순서가 필요한 쪽에서 sortRoomtypeImages() 로 직접 정렬한다.
  BaseDataMapper.prototype.getRoomtypeImages = function (roomtype, category) {
    var images = (roomtype && roomtype.images) || [];
    var filtered = images.filter(function (img) {
      return img.category === category;
    });
    var selected = filtered.filter(function (img) {
      return img.isSelected;
    });
    // isSelected 가 하나도 없으면 카테고리 전체를 폴백
    return selected.length ? selected : filtered.slice();
  };

  // 히어로 슬라이더 / 썸네일처럼 노출 순서가 필요한 곳에서 쓴다
  BaseDataMapper.prototype.sortRoomtypeImages = function (images) {
    return (images || []).slice().sort(function (a, b) {
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  };

  // ── 숙소외경이미지 ─────────────────────────────────────
  // 백오피스 "숙소관리" 의 외경 사진. main.html 의 히어로 슬라이더와
  // WELCOME 배너(.about_img)가 이 소스를 공유한다.
  //   히어로 슬라이더 : 전부
  //   WELCOME 배너    : [0]
  // (room.html 의 roomtype_interior 배분 규약과 같은 방식)
  //
  // 위치와 모양이 각각 두 가지다 — 넷 다 받는다.
  //   위치: customFields.property.images 우선, 없으면 top-level property.images
  //         (getPropertyName / getPropertyNameEn 과 같은 우선순위)
  //   모양: property.images[0].exterior[]                        (중첩형 — 숙소관리 DB)
  //         property.images[] 중 category === 'property_exterior' (평탄형 — 크롤러)
  // .about_img WELCOME 배너 몫 표시 (크롤러 규약).
  // 원본이 히어로와 같은 컷을 배너로 쓰는 경우가 있어 URL 로는 구분할 수 없다.
  //
  // ⚠️ 마커는 description 에 있다. category 로 하면 어드민이 property 이미지를 화면
  //    상태로 만들 때 3종 화이트리스트 밖이라며 이미지를 버려 프리뷰까지 오지 못한다.
  //    (sinbibook-admin utils/homepage-initial-images.ts)
  //    category 를 보던 예전 데이터도 계속 받는다.
  var EXTERIOR_BANNER_MARK = 'about_banner';

  function isExteriorBanner(img) {
    if (!img) return false;
    return img.description === EXTERIOR_BANNER_MARK || img.category === EXTERIOR_BANNER_MARK;
  }

  BaseDataMapper.prototype.pickExteriorBanner = function (images) {
    return (images || []).filter(isExteriorBanner);
  };

  BaseDataMapper.prototype.excludeExteriorBanner = function (images) {
    return (images || []).filter(function (img) {
      return !isExteriorBanner(img);
    });
  };

  // 배너에 쓸 한 장. 마커가 없으면 종전처럼 외경 이미지 첫 장을 쓴다.
  BaseDataMapper.prototype.getExteriorBannerImage = function () {
    var marked = this.pickExteriorBanner(this.getMainExteriorImages({ raw: true }));
    if (marked.length) return marked[0];
    var images = this.getMainExteriorImages();
    if (!images.length) images = this.getLandscapeImages();
    return images[0] || null;
  };

  // ── 숙소소개(main.html) 이미지 칸 ─────────────────────────
  // 백오피스 숙소소개 편집 화면 기준으로 담는다 (운영 요청 2026-10).
  //   메인 소개 섹션(main.hero) 이미지 = 히어로 슬라이더 + WELCOME 배너 (원본 view.html 외경)
  //   메인 소개 섹션 타이틀·설명       = .about_top 인삿말 문구
  //   소개 섹션 조각컷 블록             = .about_top 인삿말 옆 이미지 3장 (이미지 설명이 about_greet)
  //   소개 섹션 나머지 블록             = 외경 갤러리 + .main_pic 문구·3분할 (지금과 같다)
  //
  // 예전 크롤 데이터는 외경이 숙소 외경 칸(customFields.property.images 의 property_exterior),
  // 조각컷이 메인 소개 섹션 이미지에 있다. 조각컷 블록이 없고 숙소 외경 칸에 크롤 외경이 있으면
  // 예전 배치로 읽어 재임포트 전까지 화면이 그대로다.
  var GREET_MARK = 'about_greet';

  BaseDataMapper.prototype.getMainSection = function () {
    var page = this.getPages().main;
    return (page && page.sections && page.sections[0]) || {};
  };

  BaseDataMapper.prototype.isGreetBlock = function (block) {
    return ((block && block.images) || []).some(function (img) {
      return img && img.description === GREET_MARK;
    });
  };

  BaseDataMapper.prototype.getGreetBlock = function () {
    var about = this.getMainSection().about;
    return (Array.isArray(about) ? about : []).filter(this.isGreetBlock)[0] || null;
  };

  // 외경 갤러리 · .main_pic 블록이 쓰는 소개 블록 (조각컷 블록 제외)
  BaseDataMapper.prototype.getMainAboutBlocks = function () {
    var self = this;
    var about = this.getMainSection().about;
    return (Array.isArray(about) ? about : []).filter(function (block) {
      return !self.isGreetBlock(block);
    });
  };

  BaseDataMapper.prototype.isLegacyMainLayout = function () {
    if (this.getGreetBlock()) return false;
    var images = (this.getCustomFields().property || {}).images;
    return (
      Array.isArray(images) &&
      images.some(function (img) {
        return img && (img.category === 'property_exterior' || isExteriorBanner(img));
      })
    );
  };

  // 숙소소개 외경 (히어로 슬라이더 · WELCOME 배너). options.raw 면 배너 마커 이미지도 포함한다.
  // 메인 소개 섹션 이미지가 비면 숙소 외경 칸(숙소관리 DB 포함)으로 폴백한다.
  BaseDataMapper.prototype.getMainExteriorImages = function (options) {
    if (this.isLegacyMainLayout()) return this.getPropertyExteriorImages(options);
    var raw = !!(options && options.raw);
    var hero = this.getMainSection().hero || {};
    var images = this.getSelectedImages(hero.images || []);
    if (!raw) images = this.excludeExteriorBanner(images);
    return images.length ? images : this.getPropertyExteriorImages(options);
  };

  // .about_top 인삿말 옆 조각컷 3장.
  // 조각컷 블록 → (예전 데이터) 메인 소개 섹션 이미지 → (블록이 없는 새 데이터) 외경 이미지
  BaseDataMapper.prototype.getGreetImages = function () {
    var block = this.getGreetBlock();
    if (block) return this.getSelectedImages(block.images || []);
    if (this.isLegacyMainLayout()) {
      return this.getSelectedImages((this.getMainSection().hero || {}).images || []);
    }
    return this.getMainExteriorImages();
  };

  // options.raw 가 true 면 배너 마커까지 포함해 원본 배열 그대로 돌려준다.
  BaseDataMapper.prototype.getPropertyExteriorImages = function (options) {
    var self = this;
    var raw = !!(options && options.raw);
    var sources = [(this.getCustomFields().property || {}).images, this.getProperty().images];

    for (var i = 0; i < sources.length; i++) {
      var propImages = sources[i];
      if (!Array.isArray(propImages) || !propImages.length) continue;

      var exterior = (propImages[0] && propImages[0].exterior) || [];
      if (!exterior.length) {
        // 평탄형. 배너 마커(about_banner)도 같은 배열에 있으므로 raw 일 때는 함께 담는다
        // — 안 담으면 getExteriorBannerImage() 가 마커를 못 찾아 [0] 으로 폴백한다.
        exterior = propImages.filter(function (img) {
          if (!img) return false;
          if (img.category === 'property_exterior') return true;
          // 예전 데이터: 마커가 category 에 있던 시절
          return raw && img.category === EXTERIOR_BANNER_MARK;
        });
      }
      if (!exterior.length) continue;

      if (!raw) exterior = self.excludeExteriorBanner(exterior);
      if (!exterior.length) continue;

      var selected = self.getSelectedImages(exterior);
      return selected.length
        ? selected
        : exterior.slice().sort(function (a, b) {
            return a.sortOrder - b.sortOrder;
          });
    }
    return [];
  };

  // ── 외부 전경(Landscape) 이미지 ─────────────────────────
  // 원본 사이트의 "외경보기(view.html)" 갤러리 소스.
  // A 는 백오피스 편집 화면이 8개뿐이라 원본의 `펜션소개`+`외경보기` 두 페이지를
  // main.html 하나로 병합했다. 그 안에서 세 소스를 이렇게 나눠 담는다.
  //   main.hero 이미지            = 히어로 슬라이더 + WELCOME 배너 (위 "숙소소개 이미지 칸")
  //   main.hero 문구 + 조각컷 블록 = 인삿말 (.about_top 제목·본문·이미지 3장)
  //   main.about[] (조각컷 블록 제외) = 외경 갤러리 + .main_pic 문구·3분할
  // 따라서 외경 갤러리는 about[] 블록의 이미지를 순서대로 평탄화해 쓴다.
  // index.html 의 Healing Place 도 같은 소스를 본다.
  BaseDataMapper.prototype.getLandscapeImages = function () {
    var self = this;
    var section = this.getMainSection();
    var blocks = this.getMainAboutBlocks();

    var list = [];
    blocks.forEach(function (block) {
      self.getSelectedImages((block && block.images) || []).forEach(function (img) {
        var dup = list.some(function (p) {
          return p.url === img.url;
        });
        if (!dup) list.push(img);
      });
    });
    if (list.length) return list;

    // about[] 이 비어 있을 때만 폴백
    var heroImages = this.excludeExteriorBanner(
      this.getSelectedImages((section.hero && section.hero.images) || [])
    );
    if (heroImages.length) return heroImages;

    return this.getPropertyExteriorImages();
  };

  // 객실 평면도 소스.
  // 크롤러가 원본 객실 상세의 평면도 영역에서 이미지를 찾았을 때만 이 필드/카테고리를 채운다.
  BaseDataMapper.prototype.getRoomFloorplanImages = function (roomtype) {
    if (!roomtype) return [];

    var direct =
      roomtype.floorplanImages ||
      roomtype.floorplans ||
      (roomtype.floorplan && roomtype.floorplan.images) ||
      [];
    if (direct && !Array.isArray(direct)) direct = [direct];
    if (direct.length)
      return this.getSelectedImages(direct).length ? this.getSelectedImages(direct) : direct;

    var images = roomtype.images || [];
    var filtered = images.filter(function (img) {
      return /^(roomtype_)?floorplan$|^room_floorplan$|^floor_plan$/i.test(img.category || '');
    });
    var selected = this.getSelectedImages(filtered);
    return selected.length ? selected : filtered.slice();
  };

  BaseDataMapper.prototype.getRoomFloorplanImage = function (roomtype) {
    var images = this.getRoomFloorplanImages(roomtype);
    return images.length ? images[0] : null;
  };

  // ── 배경 이미지 유틸 ────────────────────────────────────
  // url 이 있으면 cover 배경, 없으면 매핑 위치 안내용 placeholder
  BaseDataMapper.prototype.setBackground = function (el, url, label) {
    if (!el) return;
    if (url) {
      el.style.backgroundImage = 'url(' + url + ')';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
      el.style.backgroundSize = 'cover';
      el.classList.remove('empty-image-placeholder');
    } else {
      ImageHelpers.applyBackgroundPlaceholder(el, label);
    }
  };

  // ── 객실 슬라이드 공용 렌더러 ────────────────────────────
  // index.html / layout-map.html / room.html 이 같은 마크업을 쓴다.
  //   .img(thumbnail) / .img_over / .t01 "Detail Room" / .t02 객실명
  //   / .t03 구조 문자열 / .t04 "Read More"
  BaseDataMapper.prototype.renderRoomSlides = function (selector) {
    var self = this;
    var roomtypes = this.getRoomtypes();

    document.querySelectorAll(selector).forEach(function (wrapper) {
      wrapper.innerHTML = '';

      // Room Preview 카드는 groupName 과 무관하게 **항상 전체 객실**을 깐다.
      // 그룹으로 접히는 곳은 헤더 ROOMS 메뉴와 객실 상세 탭뿐이고,
      // 카드는 저마다 자기 객실 상세로 연결한다.
      roomtypes.forEach(function (rt) {
        // 원본이 내려둔 객실은 카드도 내지 않는다 — 그룹도 없고 사진도 없으면 보여줄 게 없다.
        // (kalcamping: 원본 상세가 본문뿐인 껍데기. 백오피스는 숙소관리 DB 객실명을 합쳐
        //  보여주므로 이름만으로는 걸러지지 않는다)
        // 크롤러가 이름·사진을 못 읽은 경우는 groupName 이 남아 있어 여기서 걸리지 않는다.
        if (rt && !self.getRoomGroupName(rt) && !(rt.images || []).length) return;

        var name = self.getRoomtypeName(rt);
        if (!String(name).trim() || !rt) return;

        var room = self.findRoomById(rt.id);

        var thumbs = self.sortRoomtypeImages(self.getRoomtypeImages(rt, 'roomtype_thumbnail'));
        var thumbUrl = thumbs.length ? thumbs[0].url : '';
        if (!thumbUrl) {
          // thumbnail 이 없으면 interior 첫 장으로 폴백 (노출 순서 = sortOrder)
          var interiors = self.sortRoomtypeImages(
            self.getRoomtypeImages(rt, 'roomtype_interior')
          );
          thumbUrl = interiors.length ? interiors[0].url : '';
        }

        var slide = document.createElement('div');
        slide.className = 'swiper-slide';

        var a = document.createElement('a');
        a.className = 'spe_list';
        a.href = './room.html?room_id=' + rt.id;

        var img = document.createElement('div');
        img.className = 'img';
        self.setBackground(img, thumbUrl, '객실 이미지');

        var over = document.createElement('div');
        over.className = 'img_over';
        var overImg = document.createElement('img');
        overImg.src = 'images/more.png';
        overImg.alt = '더보기';
        over.appendChild(overImg);

        var txt = document.createElement('div');
        txt.className = 'txt_box';
        [
          ['t01', 'Detail Room'],
          ['t02', name],
          ['t03', self.formatRoomStructure(room)],
          ['t04', 'Read More']
        ].forEach(function (pair) {
          var div = document.createElement('div');
          div.className = pair[0];
          div.textContent = pair[1];
          txt.appendChild(div);
        });

        a.appendChild(img);
        a.appendChild(over);
        a.appendChild(txt);
        slide.appendChild(a);
        wrapper.appendChild(slide);
      });
    });
  };

  // ── 객실 탭 네비 공용 렌더러 ─────────────────────────────
  // layout-map.html / room.html 의 .sub_cate_wrap ul.
  // 첫 번째 li("미리보기")는 유지하고 그 뒤에 객실 li 를 생성한다.
  // currentId 와 일치하는 항목에 .on 을 준다 (없으면 미리보기가 .on).
  // ── 객실 탭 네비 공용 렌더러 ─────────────────────────────
  // layout-map.html / room.html 의 `.sub_cate_wrap ul`.
  // 첫 번째 li("미리보기")는 유지하고 그 뒤에 항목을 생성한다.
  //
  // 그룹 모드에서 **그룹 안에 들어오면 그 그룹의 객실만 보여준다.**
  // 헤더 메뉴는 그룹명 하나로 접어 두는데(getRoomMenuItems), 상세 페이지에서도
  // 그대로 접으면 그룹의 첫 객실 외에는 갈 방법이 없다.
  //
  //   그룹 A동(3실) 안에서 볼 때 →  미리보기 | 객실1 | 객실2 | 객실3
  //   그룹 밖(미리보기 / 미그룹 객실) →  미리보기 | A동 | B동 | 미그룹객실…
  //
  // 다른 그룹은 이 줄에 섞지 않는다. 그룹명과 객실명이 나란히 놓이면
  // 부모/자식이 형제처럼 보인다. 다른 그룹으로는 헤더 ROOMS 메뉴나
  // `미리보기`(layout-map)를 거쳐 이동한다.
  //
  // 멤버가 1실인 그룹은 펼치지 않는다. 펼쳐 봐야 항목이 하나뿐이라
  // 탭이 비다시피 하고 그룹명과 객실명이 1:1 이라 의미도 없다.
  BaseDataMapper.prototype.renderRoomNav = function (selector, currentId) {
    var self = this;
    var roomItems = this.getRoomMenuItems();

    function appendItem(ul, label, href, active) {
      if (!String(label).trim()) return;
      var li = document.createElement('li');
      li.setAttribute('data-generated', 'room');
      if (active) li.className = 'on';
      var a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      a.title = label;
      li.appendChild(a);
      ul.appendChild(li);
    }

    document.querySelectorAll(selector).forEach(function (ul) {
      // 이전 생성분 제거 (preview 재렌더 대비)
      ul.querySelectorAll('[data-generated="room"]').forEach(function (li) {
        li.remove();
      });

      // 첫 li 는 "미리보기"(layout-map) 다. 미리보기가 꺼져 있으면 눌러도 404 이므로 숨긴다.
      var first = ul.querySelector('li');
      if (first) {
        first.className = currentId ? '' : 'on';
        first.style.display = self.isLayoutMapEnabled() ? '' : 'none';
      }

      // 현재 객실이 속한 그룹(멤버 2실 이상)을 찾는다
      var group = null;
      roomItems.forEach(function (item) {
        var members = (item && item.roomtypes) || [];
        if (members.length > 1 && self.isRoomMenuItemActive(item, currentId)) group = item;
      });

      // 그룹 안이면 그 그룹의 객실만 보여준다
      if (group) {
        group.roomtypes.forEach(function (rt) {
          appendItem(
            ul,
            self.getRoomtypeName(rt),
            './room.html?room_id=' + rt.id,
            String(rt.id) === String(currentId)
          );
        });
        return;
      }

      // 그룹 밖이면 헤더 메뉴와 같은 목록(그룹명 + 미그룹 객실)
      roomItems.forEach(function (item) {
        appendItem(
          ul,
          self.getRoomMenuLabel(item),
          self.getRoomMenuLink(item),
          self.isRoomMenuItemActive(item, currentId)
        );
      });
    });
  };

  // ── 연락처 정규화 ────────────────────────────────────────
  // BFF의 property.contactPhone 은 문자열 배열(string[])로 내려온다.
  // 배포 시점 차이로 문자열/누락도 들어올 수 있으므로 셋 다 허용해 문자열 배열로 정규화한다.
  // 계약 타입(총판A/총판B/판매대행) 분기는 BFF가 판단하므로 템플릿은 받은 배열을 그대로 렌더링한다.
  BaseDataMapper.prototype.toPhoneList = function (value) {
    var fallbackPhone = '1833-9306';
    var list = [];
    if (Array.isArray(value)) {
      list = value.filter(function (v) {
        return typeof v === 'string' && v.trim();
      });
    } else if (typeof value === 'string' && value.trim()) {
      list = [value];
    }
    return list.length > 0 ? list : [fallbackPhone];
  };

  // ── SEO 메타태그 업데이트 ──────────────────────────────────────
  BaseDataMapper.prototype.updateMetaTags = function (pageSEO) {
    var hp = this.getHomepage();
    var globalSEO = (hp && hp.seo) || {};
    var finalSEO = Object.assign({}, globalSEO, pageSEO || {});

    if (Object.keys(finalSEO).length > 0) {
      this.updateSEOInfo(finalSEO);
    }
  };

  BaseDataMapper.prototype.updateSEOInfo = function (seo) {
    if (!seo) return;

    // name 기반 meta 태그를 upsert (값 없으면 태그 생성 안 함 → 빈 태그 방지)
    function upsertMetaByName(name, content) {
      if (!content) return;
      var meta = document.head.querySelector('meta[name="' + name + '"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    }

    if (seo.title) {
      var titleEl =
        document.querySelector('title[data-page-title]') || document.querySelector('title');
      if (titleEl) titleEl.textContent = seo.title;
    }

    upsertMetaByName('description', seo.description);
    upsertMetaByName('keywords', seo.keywords);
    upsertMetaByName('naver-site-verification', seo.naverSiteVerification);
    upsertMetaByName('google-site-verification', seo.googleSiteVerification);
  };

  global.BaseDataMapper = BaseDataMapper;
})(window);
