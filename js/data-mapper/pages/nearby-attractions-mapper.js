(function (global) {
  'use strict';

  function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  function NearbyAttractionsMapper() {
    BaseDataMapper.call(this);
  }
  NearbyAttractionsMapper.prototype = Object.create(BaseDataMapper.prototype);
  NearbyAttractionsMapper.prototype.constructor = NearbyAttractionsMapper;

  NearbyAttractionsMapper.prototype.mapPage = function () {
    var section = this.getSection();

    // enabled=false (또는 섹션 자체가 없음) → 404 리다이렉트.
    // 헤더 TRAVEL 메뉴도 header-footer-mapper 가 같은 기준으로 숨긴다.
    if (!section || section.enabled === false) {
      window.location.href = '404.html';
      return;
    }

    this.mapPropertyNames();
    this.mapHeroImage(section);
    this.mapIntro(section);
    this.mapList(section);
  };

  // nearbyAttractions 페이지 섹션 (customFields.pages.nearbyAttractions.sections[0])
  NearbyAttractionsMapper.prototype.getSection = function () {
    var page = this.getPages().nearbyAttractions;
    return (page && page.sections && page.sections[0]) || null;
  };

  // MAPPER: customFields.property.propertyUnameEn / property.nameEn / property.name + [data-property-caption]
  NearbyAttractionsMapper.prototype.mapPropertyNames = function () {
    setAllText('[data-property-name-en]', this.getPropertyNameEn());
    setAllText('[data-property-name]', this.getPropertyName());
    this.applyPropertyCaptions();
  };

  // MAPPER: nearbyAttractions.hero.images[isSelected][0] → [data-nearby-hero-image]
  NearbyAttractionsMapper.prototype.mapHeroImage = function (section) {
    var hero = (section && section.hero) || {};
    var url = this.getFirstSelectedImage(hero.images || []);
    var self = this;
    document.querySelectorAll('[data-nearby-hero-image]').forEach(function (el) {
      self.setBackground(el, url, '주변여행지 대표 이미지');
    });
  };

  // MAPPER: nearbyAttractions.title/description → 상단 소개 타이틀/설명
  NearbyAttractionsMapper.prototype.mapIntro = function (section) {
    var hero = (section && section.hero) || {};
    var title =
      this.cleanText(section && section.title) || this.cleanText(hero.title) || 'Tourist Spot';
    var description =
      this.cleanText(section && section.description) ||
      this.cleanText(hero.description) ||
      '펜션 근처의 주요 관광지 정보를 확인해 보세요.';

    setAllText('[data-nearby-title]', title);
    setAllText('[data-nearby-description]', description);
  };

  // MAPPER: nearbyAttractions.about[] → [data-nearby-attractions-list]
  // li 내부: img / strong(title) / p(description) > span(이미지 description)
  //
  // ⚠️ 원본 사이트는 각 항목 <p> 안에 "(자료출처 : 대한민국 구석구석 …)" 문구를 두지만
  //    about[] 스키마에 대응 필드가 없다. 매퍼가 문구를 만들어내지 않으며,
  //    출처가 필요하면 크롤러가 description 끝에 포함시켜 내려준다.
  NearbyAttractionsMapper.prototype.mapList = function (section) {
    var self = this;
    var blocks = (section && Array.isArray(section.about) && section.about) || [];

    document.querySelectorAll('[data-nearby-attractions-list]').forEach(function (ul) {
      ul.innerHTML = '';

      blocks.forEach(function (block) {
        var images = self.getSelectedImages(block.images || []);
        var image = images[0] || (block.images && block.images[0]) || null;

        var li = document.createElement('li');

        var img = document.createElement('img');
        if (image && image.url) {
          img.src = image.url;
          img.alt = self.cleanText(block.title) || '주변여행지';
        } else {
          ImageHelpers.applyPlaceholder(img, '주변여행지 이미지');
        }
        li.appendChild(img);

        var title = self.cleanText(block.title);
        var strong = document.createElement('strong');
        strong.textContent = title;
        if (!title) strong.style.display = 'none';
        li.appendChild(strong);

        var desc = self.cleanText(block.description);
        var caption = self.cleanText(image && image.description);
        var p = document.createElement('p');
        p.innerHTML = desc ? self.nl2br(desc) : '';
        if (caption) {
          var span = document.createElement('span');
          span.innerHTML = self.nl2br(caption);
          p.appendChild(span);
        }
        if (!desc && !caption) p.style.display = 'none';
        li.appendChild(p);

        ul.appendChild(li);
      });
    });
  };

  // preview-handler 가 standalone/preview 양쪽 초기화를 담당한다
  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new NearbyAttractionsMapper();
    mapper.initialize();
    global.nearbyAttractionsMapperInstance = mapper;
  });

  global.NearbyAttractionsMapper = NearbyAttractionsMapper;
})(window);
