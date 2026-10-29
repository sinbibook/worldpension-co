(function (global) {
  'use strict';

  function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  // 메뉴명은 "펜션소개"고, 페이지 내용은 원본 about.html(펜션소개) + view.html(외경보기)
  // 두 페이지를 합친 구조다. 백오피스 편집 화면이 8개뿐이라 main 하나로 합쳤다.
  //
  //   main.hero 이미지           → 히어로 슬라이더(전부) + WELCOME 배너(about_banner, 없으면 [0])
  //   main.hero 타이틀·설명      → .about_top 인삿말 문구
  //   main.about[] 조각컷 블록   → .about_top 인삿말 옆 이미지 3장 (이미지 설명 about_greet)
  //   main.about[] 나머지        → Landscape 갤러리 + .main_pic 문구·3분할
  //   (예전 크롤 데이터는 외경 = 숙소 외경 칸, 조각컷 = main.hero 이미지 — base-mapper getMainExteriorImages)
  //   index.closing              → 맨 아래 Welcome 밴드 (index / room 과 공유)
  //
  // ⚠️ 히어로의 span/strong(WELCOME TO PENSION / About)과 갤러리 라벨(Landscape)은
  //    전부 정적이다. --font-en-main 필기체 슬롯(50~100px)이라 한글이 들어가면 깨진다.
  function MainMapper() {
    BaseDataMapper.call(this);
  }
  MainMapper.prototype = Object.create(BaseDataMapper.prototype);
  MainMapper.prototype.constructor = MainMapper;

  MainMapper.prototype.mapPage = function () {
    this.mapPropertyNames();
    this.mapHero();
    this.mapGreeting();
    this.mapExteriorBanner();
    this.mapLandscapeSlides();
    this.mapAboutBlocks();
    this.mapClosing();

    // 슬라이드가 만들어진 뒤에 Swiper 초기화
    if (typeof window.initMainSwipers === 'function') window.initMainSwipers();
    // 배너는 data-image-src 를 주입한 뒤에야 패럴랙스를 걸 수 있다
    if (typeof window.initParallax === 'function') window.initParallax();
  };

  // main 페이지 섹션 (customFields.pages.main.sections[0])
  MainMapper.prototype.getSection = function () {
    var page = this.getPages().main;
    return (page && page.sections && page.sections[0]) || {};
  };

  // 조각컷 블록은 .about_top 몫이라 .main_pic 블록에서 뺀다
  MainMapper.prototype.getAboutBlocks = function () {
    return this.getMainAboutBlocks();
  };

  // MAPPER: customFields.property.propertyUnameEn / property.nameEn / property.name + [data-property-caption]
  MainMapper.prototype.mapPropertyNames = function () {
    setAllText('[data-property-name-en]', this.getPropertyNameEn());
    setAllText('[data-property-name]', this.getPropertyName());
    this.applyPropertyCaptions();
  };

  // MAPPER: main.hero.images (배너 마커 제외) → 히어로 배경 슬라이더
  // 히어로 문구(span/strong/p)는 정적이라 여기서 건드리지 않는다.
  MainMapper.prototype.mapHero = function () {
    var self = this;
    var images = this.getMainExteriorImages();
    // 숙소외경이미지가 비면 갤러리 소스(about[] 평탄화)로 폴백해 빈 히어로를 막는다
    if (!images.length) images = this.getLandscapeImages();

    var wrapper = document.querySelector('[data-main-hero-slides]');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    // 이미지가 없으면 매핑 위치 안내용 placeholder 한 장
    if (!images.length) {
      var empty = document.createElement('div');
      empty.className = 'swiper-slide';
      ImageHelpers.applyBackgroundPlaceholder(empty, '펜션소개 대표 이미지');
      wrapper.appendChild(empty);
      return;
    }

    images.forEach(function (img) {
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      self.setBackground(slide, img.url, '펜션소개 대표 이미지');
      wrapper.appendChild(slide);
    });
  };

  // MAPPER: main.hero.title/description + 조각컷 블록 이미지 → .about_top 인삿말
  // 원본 about.html 상단 블록이다. 제목은 --font-ko-main 30px 슬롯이라 한글 여러 줄이 정상.
  // 이미지는 img01(큰 사진) + img02·03(작은 사진) 3장. 모자라면 앞에서부터 순환한다.
  MainMapper.prototype.mapGreeting = function () {
    var self = this;
    var hero = this.getSection().hero || {};

    var title = this.cleanText(hero.title);
    document.querySelectorAll('[data-main-hero-title]').forEach(function (el) {
      el.innerHTML = title ? self.nl2br(title) : '';
      el.style.display = title ? '' : 'none';
    });

    var desc = this.firstText(hero.description, this.getProperty().subtitle);
    document.querySelectorAll('[data-main-hero-description]').forEach(function (el) {
      el.innerHTML = desc ? self.nl2br(desc) : '';
      el.style.display = desc ? '' : 'none';
    });

    var images = this.getGreetImages();
    document.querySelectorAll('[data-main-hero-images]').forEach(function (box) {
      ['img01', 'img02', 'img03'].forEach(function (cls, idx) {
        var div = box.querySelector('.' + cls);
        if (!div) return;
        var picked = images.length ? images[idx % images.length] : null;
        self.setBackground(div, picked ? picked.url : '', '펜션소개 이미지 ' + (idx + 1));
      });
    });
  };

  // MAPPER: main.hero.images 중 description:'about_banner' → .about_img WELCOME 배너
  //         (마커가 없으면 외경 [0]. 예전 데이터는 숙소 외경 칸에서 같은 규칙)
  // ⚠️ background-image 를 직접 주지 않는다 (.parallax-mirror 가 z-index:-100).
  MainMapper.prototype.mapExteriorBanner = function () {
    var banner = this.getExteriorBannerImage();
    var url = (banner && banner.url) || '';

    document.querySelectorAll('[data-main-exterior-banner]').forEach(function (el) {
      if (url) {
        el.setAttribute('data-image-src', url);
      } else {
        ImageHelpers.applyBackgroundPlaceholder(el, '숙소외경이미지');
      }
    });
  };

  // MAPPER: main.about[].images → [data-main-landscape-slides]
  // 원본 view.html 의 외경 갤러리. getLandscapeImages() 가 about[] 이미지를 평탄화해 준다
  // (index.html 의 Healing Place 도 같은 소스를 본다).
  MainMapper.prototype.mapLandscapeSlides = function () {
    var self = this;
    var images = this.getLandscapeImages();

    var wrapper = document.querySelector('[data-main-landscape-slides]');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    function buildSlide(url) {
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      var box = document.createElement('div');
      box.className = 'room_box';
      var img = document.createElement('div');
      img.className = 'img';
      self.setBackground(img, url, '외부 전경');
      box.appendChild(img);
      slide.appendChild(box);
      return slide;
    }

    if (!images.length) {
      wrapper.appendChild(buildSlide(''));
      return;
    }

    images.forEach(function (image) {
      wrapper.appendChild(buildSlide(image.url));
    });
  };

  // MAPPER: main.about[] → [data-main-about-blocks]
  // 블록마다 .about_txt_box(문구) + .pic_box(3분할 이미지) 한 쌍을 생성한다.
  // 개수 가변 — 백오피스에서 소개 블록을 늘리면 그만큼 늘어난다
  // (t-template-D2 의 "블록당 1개" 규약과 동일).
  // 생성분은 .txt_box(Welcome 밴드) 앞에 삽입해, 밴드가 항상 페이지 맨 끝에 오게 한다.
  MainMapper.prototype.mapAboutBlocks = function () {
    var self = this;
    var blocks = this.getAboutBlocks();
    var hero = this.getSection().hero || {};

    document.querySelectorAll('[data-main-about-blocks]').forEach(function (container) {
      // 이전 생성분 제거 (preview 재렌더 대비)
      container.querySelectorAll('[data-generated="about"]').forEach(function (el) {
        el.remove();
      });

      var band = container.querySelector('.txt_box');

      // 블록이 없으면 hero 문구로 한 칸만 만든다 (레이아웃이 비지 않도록)
      var list = blocks.length ? blocks : [{ title: hero.title, description: hero.description }];

      list.forEach(function (block, i) {
        var title = self.cleanText(block && block.title);
        var desc = self.cleanText(block && block.description);
        // 첫 블록의 문구가 비면 hero 로 폴백한다
        if (i === 0 && !title && !desc) {
          title = self.cleanText(hero.title);
          desc = self.cleanText(hero.description);
        }
        var hasText = !!(title || desc);

        if (hasText) {
          var txtBox = document.createElement('div');
          txtBox.className = 'about_txt_box sub_inner';
          txtBox.setAttribute('data-generated', 'about');

          var strong = document.createElement('strong');
          strong.innerHTML = title ? self.nl2br(title) : '';
          if (!title) strong.style.display = 'none';

          var p = document.createElement('p');
          p.innerHTML = desc ? self.nl2br(desc) : '';
          if (!desc) p.style.display = 'none';

          txtBox.appendChild(strong);
          txtBox.appendChild(p);
          container.insertBefore(txtBox, band);
        }

        // 3분할 이미지 — 해당 블록의 이미지를 쓰고, 없으면 전체 풀에서 가져온다
        var images = self.getSelectedImages((block && block.images) || []);
        if (!images.length) images = self.getLandscapeImages();
        // 갤러리가 첫 장부터 쓰므로 그 뒤부터, 모자라면 앞에서 순환
        var picked = images.length > 3 ? images.slice(1).concat(images) : images.concat(images);

        var picBox = document.createElement('div');
        picBox.className = 'pic_box';
        picBox.setAttribute('data-generated', 'about');
        // 문구가 없으면 겹침(margin-top:-220px)을 해제한다
        if (!hasText) picBox.classList.add('no-txt');

        var picList = document.createElement('div');
        picList.className = 'pic_list';

        ['img01', 'img02', 'img03'].forEach(function (cls, idx) {
          var div = document.createElement('div');
          div.className = cls;
          self.setBackground(div, picked[idx] ? picked[idx].url : '', '전경 이미지 ' + (idx + 1));
          picList.appendChild(div);
        });

        picBox.appendChild(picList);
        container.insertBefore(picBox, band);
      });
    });
  };

  // MAPPER: 맨 아래 Welcome 밴드 — index.closing 공유 (index / room 과 동일 규칙)
  MainMapper.prototype.mapClosing = function () {
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
        // 폴백 문구는 <br> 를 포함한 HTML 이라 이스케이프하지 않는다
        el.innerHTML = desc ? this.nl2br(desc) : this.CLOSING_FALLBACK_DESC_HTML;
      }.bind(this)
    );
  };

  // preview-handler 가 standalone/preview 양쪽 초기화를 담당한다
  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new MainMapper();
    mapper.initialize();
    global.mainMapperInstance = mapper;
  });

  global.MainMapper = MainMapper;
})(window);
