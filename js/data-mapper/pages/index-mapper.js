(function (global) {
  'use strict';

  // 배경 이미지 적용 (url 있으면 cover 배경, 없으면 No-Image placeholder)
  function setBackground(el, url, label) {
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
  }

  function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  // ── 랜딩 진입 판단 ─────────────────────────────────────────
  // index.html 진입을 landing.html 로 돌려야 하면 true. 쿼리 파라미터 없이 "어디서 왔는지(referrer)" 로 가른다.
  //   - 어드민 프리뷰 iframe → false (운영자가 "홈" 탭을 직접 볼 수 있어야 한다)
  //   - pages.landing.sections[0].enabled !== true → false (명시적으로 켠 경우만. 어드민 저장 시
  //     undefined 는 JSON 에서 키째 빠지므로, 누락을 '켜짐' 으로 보면 랜딩을 안 쓰는 숙소가 튕긴다)
  //   - 같은 사이트 안에서 넘어옴 → false (헤더 로고·메뉴, 랜딩의 자기 자신 카드)
  //   - 랜딩 카드에 등록된 연결 숙소 도메인에서 넘어옴 → false (그 숙소 랜딩의 카드를 눌러 온 경우)
  //   - 그 외(주소 직접 입력·즐겨찾기·검색/외부 링크) → true
  function shouldEnterLanding(landingPage) {
    if (window.top !== window.self) return false;

    var section = landingPage && landingPage.sections && landingPage.sections[0];
    if (!section || section.enabled !== true) return false;

    return !isFromSameSite() && !isFromLinkedProperty(section);
  }

  function getReferrerUrl() {
    try {
      return document.referrer ? new URL(document.referrer) : null;
    } catch (e) {
      return null;
    }
  }

  function isFromSameSite() {
    var ref = getReferrerUrl();
    return !!ref && ref.origin === window.location.origin;
  }

  // 크로스 도메인 referrer 는 브라우저 기본 정책상 origin 만 오므로 호스트로만 비교한다 (www. 유무는 무시).
  function isFromLinkedProperty(section) {
    var ref = getReferrerUrl();
    if (!ref) return false;

    var refHost = normalizeHost(ref.host);
    return ((section && section.about) || []).some(function (card) {
      var domain = card && typeof card.domain === 'string' ? card.domain.trim() : '';
      if (!domain) return false;
      try {
        var url = new URL(/^https?:\/\//i.test(domain) ? domain : 'https://' + domain);
        return normalizeHost(url.host) === refHost;
      } catch (e) {
        return false;
      }
    });
  }

  // 랜딩으로 이동을 시작했으면 true. location.replace 는 즉시 페이지를 떠나지 않으므로,
  // 그 사이 다른 매핑(헤더 등)이 끝나며 부르는 __tplReveal 이 index 를 잠깐 드러내지 않게 막는 데 쓴다.
  var leavingToLanding = false;

  function goToLanding() {
    leavingToLanding = true;
    window.location.replace('landing.html');
  }

  function normalizeHost(host) {
    return String(host || '').toLowerCase().replace(/^www\./, '');
  }

  function IndexMapper() {
    BaseDataMapper.call(this);
  }
  IndexMapper.prototype = Object.create(BaseDataMapper.prototype);
  IndexMapper.prototype.constructor = IndexMapper;

  IndexMapper.prototype.mapPage = function () {
    if (this.maybeRedirectToLanding()) return;

    this.mapPropertyNames();
    this.mapHero();
    this.mapRoomSlides();
    this.mapSpecialList();
    this.mapLandscapeSlides();
    this.mapClosing();

    // 슬라이드가 만들어진 뒤에 Swiper / parallax 초기화
    if (typeof window.initIndexSwipers === 'function') window.initIndexSwipers();
    if (typeof window.initParallax === 'function') window.initParallax();
  };

  // 루트 가드: 랜딩 진입 대상이면 index.html 진입을 landing.html 로 되돌린다 (판단은 shouldEnterLanding).
  IndexMapper.prototype.maybeRedirectToLanding = function () {
    if (!shouldEnterLanding(this.getPages().landing)) return false;

    goToLanding();
    return true;
  };

  // index 페이지 섹션 (customFields.pages.index.sections[0])
  IndexMapper.prototype.getSection = function () {
    var page = this.getPages().index;
    return (page && page.sections && page.sections[0]) || {};
  };

  // MAPPER: customFields.property.propertyUnameEn / property.nameEn / property.name
  IndexMapper.prototype.mapPropertyNames = function () {
    setAllText('[data-property-name-en]', this.getPropertyNameEn());
    setAllText('[data-property-name]', this.getPropertyName());
    // 숙소명이 문장 안에 들어가는 슬롯 ([data-property-caption])
    this.applyPropertyCaptions();
  };

  // MAPPER: pages.index.sections[0].hero.images[isSelected] → [data-index-hero-slides]
  //         pages.index.sections[0].hero.description → [data-index-hero-description]
  IndexMapper.prototype.mapHero = function () {
    var hero = this.getSection().hero || {};
    var images = this.getSelectedImages(hero.images || []);

    // 히어로 타이틀 — 원본의 숙소 표시명 자리다. getPropertyNameEn() 과 다른 필드라
    // 별도 슬롯을 쓴다 (.pic_title / room 배너 / Hello, 는 영문명 그대로 간다).
    setAllText('[data-index-hero-title]', this.firstText(hero.title, this.getPropertyNameEn()));

    // 히어로 로고: index.essence.images[isSelected][0]
    // 원본 히어로 문구 자리가 이미지인 숙소(아그니초시매)는 크롤러가 그 이미지를 essence 에 넣는다.
    // A형은 essence 섹션을 안 쓰므로 그 칸을 로고 칸으로 빌린다. 로고가 있으면 WELCOME 줄·표시명 대신
    // 로고를 보이고(원본도 WELCOME 줄을 주석 처리했다), 없으면 지금 텍스트 화면 그대로 둔다.
    var logo = this.getSelectedImages((this.getSection().essence || {}).images || [])[0];
    var logoAlt = this.firstText(hero.title, this.getPropertyName());
    document.querySelectorAll('[data-index-hero-logo]').forEach(function (box) {
      var txtTop = box.closest('.main_txt_top');
      box.innerHTML = '';
      box.hidden = !(logo && logo.url);
      if (txtTop) txtTop.classList.toggle('has-logo', !box.hidden);
      if (box.hidden) return;
      var img = document.createElement('img');
      img.src = logo.url;
      img.alt = logoAlt;
      box.appendChild(img);
    });

    // 히어로 보조 문구: hero.description → 폴백 property.subtitle
    // (백오피스 빈 값이 공백 한 칸으로 오므로 firstText 로 걸러낸다)
    var desc = this.firstText(hero.description, this.getProperty().subtitle);
    document.querySelectorAll('[data-index-hero-description]').forEach(
      function (el) {
        el.innerHTML = desc ? this.nl2br(desc) : '';
      }.bind(this)
    );

    var wrapper = document.querySelector('[data-index-hero-slides]');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    // 이미지가 없으면 매핑 위치 안내용 placeholder 한 장
    if (!images.length) {
      var empty = document.createElement('div');
      empty.className = 'swiper-slide';
      ImageHelpers.applyBackgroundPlaceholder(empty, '메인 비주얼');
      wrapper.appendChild(empty);
      return;
    }

    images.forEach(function (img) {
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      setBackground(slide, img.url, '메인 비주얼');
      wrapper.appendChild(slide);
    });
  };

  // MAPPER: customFields.roomtypes[] → [data-index-room-slides]
  // 슬라이드 마크업은 layout-map / room 과 동일하므로 BaseDataMapper 의 공용 렌더러를 쓴다.
  IndexMapper.prototype.mapRoomSlides = function () {
    this.renderRoomSlides('[data-index-room-slides]');
  };

  // MAPPER: property.facilities[] → [data-index-special-list]
  // .parallax-window[data-image-src] > a.spe_in_txt > .txt_box > strong(영문명) + p(시설명)
  // 앞에서부터 최대 3개만 노출한다 (3개 이하면 있는 만큼).
  IndexMapper.prototype.mapSpecialList = function () {
    var self = this;
    var facilities = (this.getProperty().facilities || []).slice(0, 3);

    document.querySelectorAll('[data-index-special-list]').forEach(function (container) {
      container.innerHTML = '';

      facilities.forEach(function (f) {
        var url =
          self.getFirstSelectedImage(f.images || []) ||
          (f.images && f.images[0] && f.images[0].url) ||
          '';

        var win = document.createElement('div');
        win.className = 'parallax-window';
        win.setAttribute('data-parallax', 'scroll');
        if (url) {
          // 배경은 건드리지 않는다. parallax.js 가 만드는 .parallax-mirror 는
          // z-index:-100 이라 여기에 background-image 를 걸면 미러가 가려져
          // 패럴랙스가 사라지고 cover 크롭만 보인다. (원본도 background:transparent)
          // parallax.js 가 없을 때의 폴백은 common.js 의 initParallax() 가 처리한다.
          win.setAttribute('data-image-src', url);
        } else {
          ImageHelpers.applyBackgroundPlaceholder(win, '부대시설 이미지');
        }

        var a = document.createElement('a');
        a.className = 'spe_in_txt';
        a.href = './facility.html?id=' + f.id;

        var txt = document.createElement('div');
        txt.className = 'txt_box';

        // 원본은 strong=영문명 / p=한글명 구조였지만, facilities[] 에 nameEn 이
        // 없는 응답이 일반적이라 strong 이 한글명으로 폴백된다.
        // 시설 설명은 쓰지 않는다 — strong 이 영문명일 때만 p 에 한글명을 넣고,
        // 한글명으로 폴백됐으면 p 를 숨겨 같은 이름이 두 번 나오지 않게 한다.
        var strong = document.createElement('strong');
        strong.textContent = self.firstText(f.nameEn, f.name);

        var p = document.createElement('p');
        var isNameEnUsed = !!self.cleanText(f.nameEn);
        p.textContent = isNameEnUsed ? self.cleanText(f.name) : '';
        if (!p.textContent) p.style.display = 'none';

        txt.appendChild(strong);
        txt.appendChild(p);
        a.appendChild(txt);
        win.appendChild(a);
        container.appendChild(win);
      });
    });
  };

  // MAPPER: pages.main.sections[0].hero.images[isSelected] → [data-index-landscape-slides]
  // 원본 index 의 Healing Place 는 외경(view) 사진을 돌린다.
  // D2 규약대로 main.hero.images 가 1순위, 비면 property.images[0].exterior 폴백.
  IndexMapper.prototype.mapLandscapeSlides = function () {
    var images = this.getLandscapeImages();

    var wrapper = document.querySelector('[data-index-landscape-slides]');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    if (!images.length) {
      var empty = document.createElement('div');
      empty.className = 'swiper-slide';
      var emptyBox = document.createElement('div');
      emptyBox.className = 'room_box';
      var emptyImg = document.createElement('div');
      emptyImg.className = 'img';
      ImageHelpers.applyBackgroundPlaceholder(emptyImg, '외부 전경');
      emptyBox.appendChild(emptyImg);
      empty.appendChild(emptyBox);
      wrapper.appendChild(empty);
      return;
    }

    images.forEach(function (image) {
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      var box = document.createElement('div');
      box.className = 'room_box';
      var img = document.createElement('div');
      img.className = 'img';
      setBackground(img, image.url, '외부 전경');
      box.appendChild(img);
      slide.appendChild(box);
      wrapper.appendChild(slide);
    });
  };

  // MAPPER: pages.index.sections[0].closing → [data-index-closing-images/title/description]
  IndexMapper.prototype.mapClosing = function () {
    var closing = this.getSection().closing || {};
    var images = this.getSelectedImages(closing.images || []);

    // 제목이 비어 있으면 원본 사이트 카피 그대로 "Welcome to {nameEn}" 로 채운다.
    // 영문 폴백이므로 서체는 로고와 같은 --font-en-main(필기체) 스택을 쓴다.
    // (한글이 입력되면 스택의 ko-main 으로 글자 단위 폴백된다)
    var nameEn = this.cleanText(this.getPropertyNameEn());
    var closingTitle = this.firstText(closing.title, nameEn ? 'Welcome to ' + nameEn : '');
    setAllText('[data-index-closing-title]', closingTitle);

    // 설명은 데이터 우선 + 폴백. 직접 입력하면 그 값이, 비어 있으면 원본 카피가 나온다.
    var desc = this.cleanText(closing.description);
    document.querySelectorAll('[data-index-closing-description]').forEach(
      function (el) {
        // 폴백 문구는 <br> 를 포함한 HTML 이라 이스케이프하지 않는다
        el.innerHTML = desc ? this.nl2br(desc) : this.CLOSING_FALLBACK_DESC_HTML;
      }.bind(this)
    );

    // .pic_list 는 img01 / img02 / img03 3분할 고정 레이아웃이다.
    document.querySelectorAll('[data-index-closing-images]').forEach(function (container) {
      ['img01', 'img02', 'img03'].forEach(function (cls, idx) {
        var el = container.querySelector('.' + cls);
        if (!el) return;
        var url = images[idx] ? images[idx].url : '';
        setBackground(el, url, '마무리 이미지 ' + (idx + 1));
      });
    });
  };

  // preview-handler 가 로드되어 있으면 standalone/preview 양쪽 초기화를 그쪽이 담당한다.
  // (preview-handler.js 는 항상 window.previewHandler 를 만든다)
  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new IndexMapper();
    mapper.initialize();
    global.indexMapperInstance = mapper;
  });

  // 조기 랜딩 가드 — 매핑을 기다리지 않고 이 스크립트가 로드되자마자 랜딩 여부부터 판단한다.
  //   standalone 에서는 preview-handler 가 어드민 데이터를 2초 기다린 뒤에야 index 를 매핑하는데,
  //   그 사이 헤더 매핑이 렌더 게이트를 먼저 풀어 매핑 전 index(히어로 < > 화살표 등)가 보였다가
  //   랜딩으로 넘어갔다. 판단이 끝날 때까지 __tplReveal 을 붙잡아 둔다.
  //   - 랜딩 진입 대상(shouldEnterLanding) → 화면을 풀지 않고 곧장 landing.html. 이동 판단 뒤에 헤더 매핑이
  //     끝나며 노출을 요청해도 무시한다 (판단 = 노출 허용으로 보면 페이지를 떠나기 직전 index 가 비친다)
  //   - 그 외 → 붙잡아 둔 노출을 그대로 진행 (기존과 같은 화면. JSON 한 번 더 읽는 시간만큼 늦게 뜰 수 있다)
  //   - 네트워크 실패/지연 대비 3초 뒤에는 무조건 판단을 끝낸다 (head 의 렌더 게이트 타임아웃과 같은 값)
  //   iframe(어드민 프리뷰)·내부 이동은 JSON 을 읽기 전에 바로 건너뛴다 (어차피 랜딩으로 안 보낸다).
  (function earlyLandingGate() {
    if (window.top !== window.self) return;
    if (isFromSameSite()) return;

    var reveal = window.__tplReveal;
    var decided = false;
    var pending = false;

    function finish() {
      if (decided) return;
      decided = true;
      if (pending && reveal) reveal();
    }

    window.__tplReveal = function () {
      if (leavingToLanding) return; // 랜딩으로 떠나는 중 — 노출하지 않는다
      if (decided) {
        if (reveal) reveal();
      } else {
        pending = true;
      }
    };

    setTimeout(function () {
      pending = true;
      finish();
    }, 3000);

    fetch('standard-template-data.json?t=' + Date.now())
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        var customFields = (data && data.homepage && data.homepage.customFields) || (data && data.customFields) || {};
        var landing = customFields.pages && customFields.pages.landing;
        if (!decided && shouldEnterLanding(landing)) {
          decided = true;
          goToLanding(); // 노출하지 않고 이동한다 (이후 들어오는 노출 요청은 무시)
          return;
        }
        finish();
      })
      .catch(finish);
  })();

  global.IndexMapper = IndexMapper;
})(window);
