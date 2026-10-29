(function (global) {
  'use strict';

  function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  function DirectionsMapper() {
    BaseDataMapper.call(this);
  }
  DirectionsMapper.prototype = Object.create(BaseDataMapper.prototype);
  DirectionsMapper.prototype.constructor = DirectionsMapper;

  DirectionsMapper.KAKAO_MAP_ZOOM_LEVEL = 4;
  DirectionsMapper.SDK_WAIT_INTERVAL = 100;

  DirectionsMapper.prototype.mapPage = function () {
    this.mapPropertyNames();
    this.mapHeroImage();
    this.mapAddress();
    this.mapNotice();
    this.mapKakaoMap();
  };

  // directions 페이지 섹션 (customFields.pages.directions.sections[0])
  DirectionsMapper.prototype.getSection = function () {
    var page = this.getPages().directions;
    return (page && page.sections && page.sections[0]) || {};
  };

  // MAPPER: customFields.property.propertyUnameEn / property.nameEn / property.name + [data-property-caption]
  DirectionsMapper.prototype.mapPropertyNames = function () {
    setAllText('[data-property-name-en]', this.getPropertyNameEn());
    setAllText('[data-property-name]', this.getPropertyName());
    this.applyPropertyCaptions();
  };

  // MAPPER: directions.hero.images[isSelected][0] → [data-directions-hero-image]
  DirectionsMapper.prototype.mapHeroImage = function () {
    var hero = this.getSection().hero || {};
    var url = this.getFirstSelectedImage(hero.images || []);
    var self = this;
    document.querySelectorAll('[data-directions-hero-image]').forEach(function (el) {
      self.setBackground(el, url, '오시는길 대표 이미지');
    });
  };

  // MAPPER: property.address → [data-property-address]
  DirectionsMapper.prototype.mapAddress = function () {
    var address = this.cleanText(this.getProperty().address);
    document.querySelectorAll('[data-property-address]').forEach(function (el) {
      el.textContent = address ? '주소 : ' + address : '';
      el.style.display = address ? '' : 'none';
    });
  };

  // MAPPER: directions.notice.title / .description → [data-directions-notice]
  // notice 가 배열로 오는 경우도 있어 둘 다 받는다 (항목당 dt/dd 한 쌍).
  DirectionsMapper.prototype.mapNotice = function () {
    var self = this;
    var notice = this.getSection().notice;
    var list = Array.isArray(notice) ? notice : notice ? [notice] : [];

    document.querySelectorAll('[data-directions-notice]').forEach(function (dl) {
      dl.innerHTML = '';

      var rendered = 0;
      list.forEach(function (item) {
        var title = self.cleanText(item && item.title);
        var desc = self.cleanText(item && item.description);
        if (!title && !desc) return;

        if (title) {
          var dt = document.createElement('dt');
          dt.textContent = title;
          dl.appendChild(dt);
        }
        if (desc) {
          var dd = document.createElement('dd');
          dd.innerHTML = self.nl2br(desc);
          dl.appendChild(dd);
        }
        rendered += 1;
      });

      dl.style.display = rendered ? '' : 'none';
    });
  };

  // MAPPER: property.latitude / property.longitude → 카카오 지도 + 마커
  // 원본은 daum roughmap 임베드(고정 key)였으나 좌표 기반 SDK 로 교체했다.
  DirectionsMapper.prototype.mapKakaoMap = function () {
    var property = this.getProperty();
    var container = document.getElementById('kakao-map');
    if (!container) return;

    // 좌표가 없어도 영역은 그대로 둔다.
    // CSS(.sub_traffic .map #kakao-map)가 높이와 배경색을 갖고 있어
    // 지도가 안 그려져도 자리가 유지된다 (지도 렌더 시 타일이 덮음).
    if (!property.latitude || !property.longitude) return;

    var self = this;
    var createMap = function () {
      try {
        var position = new kakao.maps.LatLng(property.latitude, property.longitude);

        // 백오피스 preview 는 데이터가 바뀔 때마다 mapPage() 를 다시 부른다.
        // 그때마다 new kakao.maps.Map() 을 만들면 인스턴스가 쌓이므로,
        // 이미 만들어 둔 지도가 있으면 중심/마커만 옮긴다.
        if (self._kakaoMap) {
          self._kakaoMap.setCenter(position);
          self._kakaoMap.relayout();
          if (self._kakaoMarker) self._kakaoMarker.setPosition(position);
          return;
        }

        self._kakaoMap = new kakao.maps.Map(container, {
          center: position,
          level: DirectionsMapper.KAKAO_MAP_ZOOM_LEVEL,
          scrollwheel: false,
          draggable: false
        });
        self._kakaoMarker = new kakao.maps.Marker({ position: position });
        self._kakaoMarker.setMap(self._kakaoMap);

        // preview 는 iframe 크기가 바뀔 수 있어 리사이즈 시 재배치한다
        window.addEventListener('resize', function () {
          if (self._kakaoMap) {
            self._kakaoMap.relayout();
            self._kakaoMap.setCenter(position);
          }
        });
      } catch (error) {
        console.error('Failed to create Kakao Map:', error);
      }
    };

    // SDK 로드 확인 및 재시도 (최대 2초)
    var checkSdkAndLoad = function (retryCount) {
      retryCount = retryCount || 0;
      var MAX_RETRIES = 20;
      if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
        window.kakao.maps.load(createMap);
      } else if (retryCount < MAX_RETRIES) {
        setTimeout(function () {
          checkSdkAndLoad(retryCount + 1);
        }, DirectionsMapper.SDK_WAIT_INTERVAL);
      } else {
        console.error('Failed to load Kakao Map SDK after multiple retries.');
      }
    };

    checkSdkAndLoad();
  };

  // preview-handler 가 standalone/preview 양쪽 초기화를 담당한다
  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new DirectionsMapper();
    mapper.initialize();
    global.directionsMapperInstance = mapper;
  });

  global.DirectionsMapper = DirectionsMapper;
})(window);
