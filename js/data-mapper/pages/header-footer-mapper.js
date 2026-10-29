(function (global) {
  'use strict';

  var YBS_BASE_URL = 'https://www.yapen.co.kr/external?ypIdx=';

  // 상담하기 — 뒤에 property.tripPropertyId 가 붙는다
  var CONSULT_BASE_URL = 'https://www.bookingplay.co.kr/api/cti_eicn/kakao_happy_talk?tid=';

  // 파트너 타입 — 원천은 백오피스 DB `public.contract_info.partner_type` 이고
  // BFF 가 코드 문자열을 그대로 내려준다. **분기는 템플릿이 한다**(PC/모바일은 템플릿만 안다).
  //
  //   distributor_a  총판A     PC 상담하기 / 모바일 상담하기 + 예약하기
  //   distributor_b  총판B     PC 없음     / 모바일 예약하기
  //   sales_agency   판매대행  PC 없음     / 모바일 예약하기
  //
  // ⚠️ 예약하기는 **파트너 타입과 무관**하다 — 세 타입 모두 모바일에서만 뜬다.
  //    그건 기존 `.ft_btn_reserve.for_m` 의 미디어쿼리가 이미 하고 있어 손대지 않는다.
  //    타입으로 갈리는 것은 상담하기 하나뿐이다.
  var CONSULT_PARTNER_TYPES = ['distributor_a'];

  // ⚠️ base-mapper 에 `cleanText` 가 없는 템플릿이 있어 의존하지 않는다.
  function consultText(v) {
    return v === undefined || v === null ? '' : String(v).trim();
  }



  function HeaderFooterMapper() {
    BaseDataMapper.call(this);
  }
  HeaderFooterMapper.prototype = Object.create(BaseDataMapper.prototype);
  HeaderFooterMapper.prototype.constructor = HeaderFooterMapper;

  HeaderFooterMapper.prototype.mapPage = function () {
    this.mapPropertyNames();
    this.mapHeaderLogo();
    this.mapFavicon();
    this.mapBookingLinks();
    this.mapYbs();
    this.mapConsult();
    this.mapSocialLinks();
    this.mapRoomMenu();
    this.mapSpecialMenu();
    this.mapPageToggles();
    this.mapFooter();
    // SEO: homepage.seo → title + description/keywords + 네이버/구글 사이트 인증 (전 페이지 공통)
    this.updateMetaTags();
  };

  // 페이지 enabled 여부 (sections[0].enabled === false 이면 비활성)
  HeaderFooterMapper.prototype.isPageEnabled = function (pageKey) {
    var page = this.getPages()[pageKey];
    var section = page && page.sections && page.sections[0];
    return !(section && section.enabled === false);
  };

  // MAPPER: customFields.property.propertyUnameEn / property.nameEn / property.name → [data-property-name-en] / [data-property-name]
  // A 템플릿의 로고는 이미지가 아니라 "텍스트"다 (원본 사이트와 동일).
  // 헤더에 슬롯이 2개 — .logo(중앙, 영문+한글 2줄) / .logo2(좌측, 영문 1줄).
  // 서체는 styles/theme.css 의 --font-en-main 이 담당한다.
  HeaderFooterMapper.prototype.mapPropertyNames = function () {
    var nameEn = this.getPropertyNameEn();
    var name = this.getPropertyName();

    document.querySelectorAll('[data-property-name-en]').forEach(function (el) {
      el.textContent = nameEn;
    });
    document.querySelectorAll('[data-property-name]').forEach(function (el) {
      el.textContent = name;
    });

    this.fitLogo(nameEn);
  };

  // MAPPER: pages.index.sections[0].gallery.images[isSelected][0] → [data-header-logo]
  // 원본 헤더가 이미지인 숙소(아그니초시매·에벤에셀펜션 등)만 크롤러가 이 칸을 채운다.
  // A형은 index.gallery 를 안 써서 헤더 로고 칸으로 빌린다. 기본정보 로고는 텍스트 헤더 숙소에도
  // 올라가 있어(2026-10 기준 8곳 중 6곳) 헤더 전환 기준으로 쓸 수 없다 — 파비콘·푸터 전용 그대로.
  // 로고 한 장을 두 자리에 쓴다: 투명 헤더(.logo)는 CSS 로 흰색 반전, 흰 배경(.logo2)은 원래 색 (E2 방식).
  // 이미지가 없으면 .has-img 를 떼어 텍스트(숙소영문명) 그대로 둔다.
  HeaderFooterMapper.prototype.mapHeaderLogo = function () {
    var index = this.getPages().index;
    var section = (index && index.sections && index.sections[0]) || {};
    var logo = this.getSelectedImages((section.gallery || {}).images || [])[0];
    var url = logo && logo.url;
    var alt = this.getPropertyName();

    document.querySelectorAll('[data-header-logo]').forEach(function (link) {
      var slot = link.parentNode;
      link.innerHTML = '';
      if (slot) slot.classList.toggle('has-img', !!url);
      if (!url) return;
      var img = document.createElement('img');
      img.src = url;
      img.alt = alt;
      link.appendChild(img);
    });
  };

  // 중앙 로고(.logo)는 좌우 메뉴 사이 여백(약 340px)에 들어가야 한다.
  // 필기체(--font-en-main)는 자간이 넓어 이름이 길면 SPECIAL / RESERVE 를 침범하므로
  // 글자 수를 보고 단계적으로 축소한다. (CSS: .logo.is-long / .logo.is-xlong)
  HeaderFooterMapper.prototype.LOGO_LONG = 18;
  HeaderFooterMapper.prototype.LOGO_XLONG = 28;

  HeaderFooterMapper.prototype.fitLogo = function (nameEn) {
    var len = (nameEn || '').length;
    var self = this;
    document.querySelectorAll('.logo, .logo2').forEach(function (el) {
      el.classList.remove('is-long', 'is-xlong');
      if (len > self.LOGO_XLONG) el.classList.add('is-xlong');
      else if (len > self.LOGO_LONG) el.classList.add('is-long');
    });
  };

  // MAPPER: favicon ← homepage.images[0].logo[isSelected].url
  // 로고 이미지는 헤더에 쓰지 않고 파비콘 용도로만 사용한다.
  HeaderFooterMapper.prototype.mapFavicon = function () {
    var logoUrl = this.getLogo();
    if (!logoUrl) return;
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;
  };

  // MAPPER: property.realtimeBookingId → [data-booking-link] (href 직접 주입)
  HeaderFooterMapper.prototype.mapBookingLinks = function () {
    var bookingUrl = this.getBookingUrl();
    document.querySelectorAll('[data-booking-link]').forEach(function (el) {
      if (bookingUrl && bookingUrl !== '#!') {
        el.href = bookingUrl;
        el.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: property.ybsId → [data-ybs-button] (없으면 숨김)
  HeaderFooterMapper.prototype.mapYbs = function () {
    var ybsId = this.getProperty().ybsId;
    document.querySelectorAll('[data-ybs-button]').forEach(function (el) {
      var host = el.closest('.privacy') || el;
      if (!ybsId) {
        host.style.display = 'none';
        return;
      }
      host.style.display = '';
      var target = el.tagName === 'A' ? el : el.querySelector('a');
      if (target) {
        target.href = YBS_BASE_URL + ybsId;
        target.setAttribute('target', '_blank');
      }
    });
  };

  // 상담 URL 에 쓸 tripPropertyId. 없거나 형식이 아니면 빈 문자열.
  HeaderFooterMapper.prototype.getConsultId = function () {
    var raw = consultText(this.getProperty().tripPropertyId);
    // ⚠️ URL 쿼리에 그대로 붙는 값이라 토큰 형태만 통과시킨다. 플레이스홀더
    //    문자열(`숙소 ID` 같은 한글·공백)이 들어와도 링크가 깨지지 않는다.
    return /^[A-Za-z0-9_-]+$/.test(raw) ? raw : '';
  };

  // 상담하기 노출 대상인가 — 파트너 타입 + tripPropertyId 둘 다 있어야 한다.
  HeaderFooterMapper.prototype.isConsultVisible = function () {
    var partnerType = consultText(this.getProperty().partnerType);
    return Boolean(this.getConsultId()) && CONSULT_PARTNER_TYPES.indexOf(partnerType) !== -1;
  };

  // MAPPER: property.tripPropertyId + partnerType → [data-consult-button] (우측 하단 상담하기)
  //
  // 총판A 만 노출하고, `tripPropertyId` 가 비면 타입과 무관하게 숨긴다.
  // 값이 없으면 `[data-consult-wrap]` 째 숨긴다 — 버튼만 숨기면 빈 박스가 남는다.
  HeaderFooterMapper.prototype.mapConsult = function () {
    var tripPropertyId = this.getConsultId();
    var visible = this.isConsultVisible();

    // 상담하기가 빠지면 예약하기 아래가 비어 버린다.
    // CSS 가 위치를 되돌릴 수 있도록 상태를 루트에 찍는다.
    document.documentElement.setAttribute('data-consult', visible ? 'on' : 'off');

    document.querySelectorAll('[data-consult-button]').forEach(function (el) {
      var host = el.closest('[data-consult-wrap]') || el;
      if (!visible) {
        host.style.display = 'none';
        return;
      }
      host.style.display = '';
      var target = el.tagName === 'A' ? el : el.querySelector('a');
      if (target) {
        target.href = CONSULT_BASE_URL + tripPropertyId;
        target.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: homepage.socialLinks.{facebook|instagram|blog|youtube} → [data-homepage-socialLinks-{platform}]
  // 값이 있으면 href 를 넣고 노출, 없으면(null·빈 문자열·키 없음) 숨김.
  // 래퍼([data-social-wrap] — 헤더 .btn_hd_res.naver/.insta / aside li)가 있으면 래퍼째 숨겨 빈 칸·간격이 남지 않게 한다.
  // A 템플릿 마크업은 네이버(blog)·인스타그램(instagram) 두 가지이고,
  // facebook / youtube 는 매칭 요소 0개라 아무 일도 없다.
  // 래퍼는 마크업에서 style="display: none" 으로 시작한다(매핑 전 깜빡임 방지).
  // 노출은 inline display 를 지워서 CSS(.header.on .btn_hd_res 등)에 맡긴다.
  HeaderFooterMapper.prototype.SOCIAL_PLATFORMS = ['facebook', 'instagram', 'blog', 'youtube'];

  HeaderFooterMapper.prototype.mapSocialLinks = function () {
    var links = this.getHomepage().socialLinks || {};
    this.SOCIAL_PLATFORMS.forEach(function (platform) {
      var url = consultText(links[platform]);
      document
        .querySelectorAll('[data-homepage-socialLinks-' + platform + ']')
        .forEach(function (el) {
          var host = el.closest('[data-social-wrap]') || el;
          if (!url) {
            host.style.display = 'none';
            return;
          }
          host.style.display = '';
          var target = el.tagName === 'A' ? el : el.querySelector('a');
          if (target) {
            target.href = url;
            target.setAttribute('target', '_blank');
            target.setAttribute('rel', 'noopener');
          }
        });
    });
  };

  // MAPPER: roomtypes[].name → [data-rooms-submenu] (미리보기 li 뒤에 동적 생성, PC + 모바일 aside)
  HeaderFooterMapper.prototype.mapRoomMenu = function () {
    var self = this;
    var roomItems = this.getRoomMenuItems();
    document.querySelectorAll('[data-rooms-submenu]').forEach(function (container) {
      // 이전 생성분 제거 (preview 재렌더 대비)
      container.querySelectorAll('[data-generated="room"]').forEach(function (li) {
        li.remove();
      });
      roomItems.forEach(function (item) {
        var name = self.getRoomMenuLabel(item);
        // 그래도 이름이 없으면 빈 메뉴 항목(여백)이 되므로 건너뜀
        if (!String(name).trim()) return;
        var li = document.createElement('li');
        li.setAttribute('data-generated', 'room');
        var a = document.createElement('a');
        a.href = self.getRoomMenuLink(item);
        a.textContent = name;
        li.appendChild(a);
        container.appendChild(li);
      });
    });
  };

  // MAPPER: property.facilities[].name → [data-special-submenu] (컨테이너 비우고 동적 생성)
  HeaderFooterMapper.prototype.mapSpecialMenu = function () {
    var facilities = this.getProperty().facilities || [];
    document.querySelectorAll('[data-special-submenu]').forEach(function (container) {
      container.innerHTML = '';
      facilities.forEach(function (f) {
        if (!f.name || !f.name.trim()) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = './facility.html?id=' + f.id;
        a.textContent = f.name;
        li.appendChild(a);
        container.appendChild(li);
      });
    });
  };

  // MAPPER: pages.layoutMap / nearbyAttractions enabled → 메뉴 표시/숨김
  //
  // 미리보기가 꺼지면 "미리보기" li 를 숨기고, 대메뉴 ROOMS([data-rooms-link])는
  // 첫 번째 객실 상세로 보낸다 — 그대로 두면 layout-map.html 이 404 로 튕긴다.
  // 판정은 layout-map.html 의 404 기준과 같은 isLayoutMapEnabled() 를 쓴다.
  HeaderFooterMapper.prototype.mapPageToggles = function () {
    var layoutMapEnabled = this.isLayoutMapEnabled();
    document.querySelectorAll('[data-menu-id="layout-map"]').forEach(function (el) {
      var li = el.closest('li') || el;
      li.style.display = layoutMapEnabled ? '' : 'none';
    });

    var roomsLink = this.getRoomsEntryLink();
    if (roomsLink) {
      document.querySelectorAll('[data-rooms-link]').forEach(function (el) {
        el.setAttribute('href', roomsLink);
      });
    }

    var nearbyEnabled = this.isPageEnabled('nearbyAttractions');
    document.querySelectorAll('[data-travel-menu]').forEach(function (el) {
      el.style.display = nearbyEnabled ? '' : 'none';
    });
  };

  // 전화번호 링크(<a data-footer-phone-link>)를 번호 개수만큼 복제해 " | " 로 구분 노출.
  // 모바일 aside 의 .aside_ico03 처럼 <span data-footer-phone> 이 없는 링크는 href 만 갱신한다.
  HeaderFooterMapper.prototype.renderFooterPhones = function (phones) {
    if (!phones.length) return;
    var tel0 = 'tel:' + String(phones[0]).replace(/[^0-9+]/g, '');

    document.querySelectorAll('[data-footer-phone-link]').forEach(function (link) {
      // 번호 텍스트 슬롯이 없는 링크(아이콘 버튼 등)는 첫 번째 번호로 href 만 연결
      if (!link.querySelector('[data-footer-phone]')) {
        link.setAttribute('href', tel0);
        return;
      }

      var parent = link.parentNode;
      if (!parent) return;

      // 멱등: 이전 렌더로 만든 복제 링크/구분자를 정리하고 원본 링크 하나만 남긴다
      parent.querySelectorAll('[data-footer-phone-link]').forEach(function (el, i) {
        if (i > 0) parent.removeChild(el);
      });
      parent.querySelectorAll('[data-footer-phone-sep]').forEach(function (el) {
        parent.removeChild(el);
      });

      phones.forEach(function (phone, idx) {
        var el = idx === 0 ? link : link.cloneNode(true);
        var span = el.querySelector('[data-footer-phone]');
        if (span) span.textContent = phone;
        el.setAttribute('href', 'tel:' + String(phone).replace(/[^0-9+]/g, ''));

        if (idx > 0) {
          var sep = document.createElement('span');
          sep.setAttribute('data-footer-phone-sep', '');
          sep.textContent = ' | ';
          parent.appendChild(sep);
          parent.appendChild(el);
        }
      });
    });
  };

  // MAPPER: property.contactPhone / property.businessInfo → footer 라인별 텍스트
  // 전화번호 소스는 businessInfo.businessPhone(사업자 번호)이 아니라
  // property.contactPhone(노출용 번호 배열)이다.
  // MAPPER: property.tripProviderName → [data-copyright]
  // 공급사명이 있으면 data-copyright 의 템플릿 문자열에서 {provider} 를 치환한다.
  // 값이 없으면(백오피스 미입력 → "") HTML 의 기존 트립일레븐 문구를 그대로 둔다.
  HeaderFooterMapper.prototype.mapCopyright = function () {
    var provider = String(this.getProperty().tripProviderName || '').trim();
    if (!provider) return;
    document.querySelectorAll('[data-copyright]').forEach(function (el) {
      var tpl = el.getAttribute('data-copyright') || '';
      el.textContent = tpl.replace(/\{provider\}/g, provider);
    });
  };

  // MAPPER: customFields.footer.ruralStayMark → [data-footer-rural-stay-mark] (푸터 맨 위, 전화번호 위)
  //         로고 → [data-footer-logo] (주소 아래)
  // 농어촌민박사업자 이미지가 있을 때만 두 영역을 노출한다. 로고는 로고가 있을 때만.
  // 없으면 모두 숨겨 기존 푸터와 같다. 프리뷰는 같은 페이지에서 다시 매핑하므로 매번 표시 상태를 되돌린다.
  HeaderFooterMapper.prototype.mapFooterMarks = function () {
    var footer = this.getCustomFields().footer || {};
    var mark = footer.ruralStayMark;
    var markUrl = mark && mark.url ? String(mark.url) : '';
    var logoUrl = this.getLogo();

    document.querySelectorAll('[data-footer-rural-stay-mark-wrap]').forEach(function (wrap) {
      wrap.style.display = markUrl ? '' : 'none';
    });
    document.querySelectorAll('[data-footer-logo-wrap]').forEach(function (wrap) {
      wrap.style.display = markUrl && logoUrl ? '' : 'none';
    });
    document.querySelectorAll('[data-footer-rural-stay-mark]').forEach(function (img) {
      if (!markUrl) {
        img.removeAttribute('src');
        return;
      }
      img.src = markUrl;
      img.alt = (mark.description && String(mark.description).trim()) || '농어촌민박사업자';
    });
    document.querySelectorAll('[data-footer-logo]').forEach(function (img) {
      if (!markUrl || !logoUrl) {
        img.removeAttribute('src');
        return;
      }
      img.src = logoUrl;
      img.alt = this.getPropertyName();
    }, this);
  };

  HeaderFooterMapper.prototype.mapFooter = function () {
    this.mapCopyright();
    this.mapFooterMarks();
    var prop = this.getProperty();
    var biz = prop.businessInfo || {};
    var phones = this.toPhoneList(prop.contactPhone);

    var fields = {
      '[data-footer-address]': biz.businessAddress,
      '[data-footer-business-name]': biz.businessName,
      '[data-footer-representative]': biz.representativeName,
      '[data-footer-business-number]': biz.businessNumber
    };
    Object.keys(fields).forEach(function (selector) {
      var value = fields[selector];
      if (value === undefined || value === null || value === '') return;
      document.querySelectorAll(selector).forEach(function (el) {
        el.textContent = value;
      });
    });

    this.renderFooterPhones(phones);
  };

  document.addEventListener('headerFooterLoaded', function () {
    var mapper = new HeaderFooterMapper();
    mapper.initialize();
    global.headerFooterMapperInstance = mapper;
  });

  global.HeaderFooterMapper = HeaderFooterMapper;
})(window);
