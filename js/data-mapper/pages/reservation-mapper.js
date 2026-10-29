(function (global) {
  'use strict';

  function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  function ReservationMapper() {
    BaseDataMapper.call(this);
  }
  ReservationMapper.prototype = Object.create(BaseDataMapper.prototype);
  ReservationMapper.prototype.constructor = ReservationMapper;

  ReservationMapper.prototype.mapPage = function () {
    this.mapPropertyNames();
    this.mapHeroImage();
    this.mapBookingUrl();
    this.mapInfo();
    this.mapRefundPolicies();
  };

  // reservation 페이지 섹션 (customFields.pages.reservation.sections[0])
  ReservationMapper.prototype.getSection = function () {
    var page = this.getPages().reservation;
    return (page && page.sections && page.sections[0]) || {};
  };

  // MAPPER: customFields.property.propertyUnameEn / property.nameEn / property.name + [data-property-caption]
  ReservationMapper.prototype.mapPropertyNames = function () {
    setAllText('[data-property-name-en]', this.getPropertyNameEn());
    setAllText('[data-property-name]', this.getPropertyName());
    this.applyPropertyCaptions();
  };

  // MAPPER: reservation.hero.images[isSelected][0] → [data-reservation-hero-image]
  ReservationMapper.prototype.mapHeroImage = function () {
    var hero = this.getSection().hero || {};
    var url = this.getFirstSelectedImage(hero.images || []);
    var self = this;
    document.querySelectorAll('[data-reservation-hero-image]').forEach(function (el) {
      self.setBackground(el, url, '이용안내 대표 이미지');
    });
  };

  // MAPPER: property.realtimeBookingId → [data-booking-url]
  ReservationMapper.prototype.mapBookingUrl = function () {
    var url = this.getBookingUrl();
    document.querySelectorAll('[data-booking-url]').forEach(function (el) {
      if (url && url !== '#!') {
        el.href = url;
        el.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: property.usageGuide → [data-reservation-info]
  ReservationMapper.prototype.mapInfo = function () {
    var prop = this.getProperty();
    var usageGuide = this.cleanText(prop.usageGuide);

    var self = this;
    document.querySelectorAll('[data-reservation-info]').forEach(function (el) {
      if (!usageGuide) {
        el.innerHTML = '';
        return;
      }
      el.innerHTML = self.nl2br(usageGuide);
    });
  };

  // MAPPER: property.refundPolicies → [data-reservation-refund-policies]
  // 스키마: [{ refundProcessingDays, refundRate }] — 남은 일수별 환불률
  ReservationMapper.prototype.mapRefundPolicies = function () {
    var policies = this.getProperty().refundPolicies || [];
    var notice = this.cleanText((this.getProperty().refundSettings || {}).customerRefundNotice);

    document.querySelectorAll('[data-reservation-refund-policies]').forEach(function (el) {
      el.innerHTML = '';

      if (!policies.length) {
        if (notice) el.textContent = notice;
        return;
      }

      // 이용일에서 먼 날짜부터 (일수 내림차순)
      var sorted = policies.slice().sort(function (a, b) {
        return (b.refundProcessingDays || 0) - (a.refundProcessingDays || 0);
      });

      sorted.forEach(function (p) {
        var days = Number(p.refundProcessingDays) || 0;
        var rate = Number(p.refundRate) || 0;
        var line = document.createElement('p');

        var when = days > 0 ? '이용일 ' + days + '일 전 취소 시' : '이용일 당일 취소 시';
        line.textContent = '* ' + when + ' ' + (rate > 0 ? rate + '% 환불' : '환불 불가');
        el.appendChild(line);
      });

      if (notice) {
        var extra = document.createElement('p');
        extra.innerHTML = '<br />' + notice;
        el.appendChild(extra);
      }
    });
  };

  // preview-handler 가 standalone/preview 양쪽 초기화를 담당한다
  document.addEventListener('DOMContentLoaded', function () {
    if (window.previewHandler) return;
    var mapper = new ReservationMapper();
    mapper.initialize();
    global.reservationMapperInstance = mapper;
  });

  global.ReservationMapper = ReservationMapper;
})(window);
