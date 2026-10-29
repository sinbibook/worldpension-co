# Data Mapping 정의서 — t-template-A

`standard-template-data.json` 기준 각 HTML 페이지의 data-\* 속성 매핑 정의.

원본 디자인: [jejuinhouse.co.kr](https://jejuinhouse.co.kr/) / [삼척동해펜션.kr](https://xn--2q1bz9w1io6wb.kr/)
두 사이트는 **동일 템플릿**이며 `style.css` 차이가 75줄(대부분 `font-family`)뿐이다.
사이트별로 갈리던 값은 전부 `styles/theme.css` 변수로 뽑아냈다.

> 작업 진행 상황: 전 페이지 매핑 완료 (`index` / `main` / `layout-map` / `room` / `special` / `reservation` / `directions` / `nearby-attractions` / `landing` / `404`).
>
> ⚠️ **`landing` 은 아직 운영 미배포 상태다.** 백오피스에 랜딩페이지 편집 기능이 붙어야 `pages.landing` 데이터가 실제로 내려온다. 백엔드와 동시 배포 전까지는 로컬/프리뷰 테스트 용도로만 존재한다.

---

## 구현 주의사항

- 각 페이지 mapper 파일(`js/data-mapper/pages/*.js`)에서 아래 매핑 정의를 기준으로 `data-*` 속성을 탐색해 데이터를 주입한다.
- 각 mapper 는 `js/preview-handler.js` 에도 등록해야 한다. 등록하지 않으면 백오피스 미리보기에 데이터가 반영되지 않는다.
- **객실 목록의 단일 소스는 `homepage.customFields.roomtypes`**다. `BaseDataMapper.getRoomtypes()` 가 localhost/preview 두 경로를 모두 처리하므로 페이지 매퍼는 이 메서드만 쓴다.
  최상위 `rooms[]` 는 `roomtypes[i].id === rooms[j].id` 매칭으로 인원/평형/집기 등 **상세값을 조회할 때만** 사용한다.
- 이미지·아이콘 등 템플릿 고정 에셋은 `images/` 에 두고 상대경로(`images/xxx.png`)로 참조한다. 원본 사이트 도메인 직접 참조 금지.
- 페이지 간 링크는 상대경로(`./xxx.html`)를 쓴다. 절대경로는 GitHub Pages 하위 경로 배포에서 깨진다.
- **렌더 게이트**: 각 HTML `<head>` 에 `html.tpl-loading body{opacity:0}` + `window.__tplReveal` 인라인 스크립트를 둔다. 매핑 완료 시(`BaseDataMapper.initialize/updateData`, `preview-handler.renderTemplate`) 해제해 placeholder 깜빡임(FOUC)을 막는다.
- **초기화 주체는 `preview-handler`다.** 각 매퍼의 `DOMContentLoaded` 핸들러는 `if (window.previewHandler) return;` 로 빠진다. `preview-handler.js` 가 항상 `window.previewHandler` 를 만들므로 standalone/preview 양쪽을 그쪽이 구동한다.

### ⚠️ 랜딩 게이트 — `index.html` 진입을 가로챈다

`pages.landing.sections[0].enabled === true` 면 `index.html` 진입 자체를 `landing.html` 로 되돌리는 **루트 가드**가 있다 (`index-mapper.js`). 다른 옵션 페이지(`layoutMap`/`nearbyAttractions`)는 "비활성 시 404" 방향이라면, 랜딩은 반대로 "**활성 시 index 진입을 가로챈다**"는 점이 다르다.

```
IndexMapper.mapPage()  (+ 스크립트 로드 직후 earlyLandingGate 도 같은 판단)
  → maybeRedirectToLanding() → shouldEnterLanding()
      - window.top !== window.self (어드민 프리뷰 iframe) → 가드 skip
      - pages.landing.sections[0].enabled !== true → 가드 skip
      - document.referrer 가 같은 origin → 가드 skip (헤더 로고·메뉴, 랜딩의 자기 자신 카드)
      - document.referrer 호스트가 about[].domain 중 하나 → 가드 skip (연결 숙소 랜딩에서 카드로 넘어옴)
      - 그 외 (주소 직접 입력·즐겨찾기·검색/외부 링크) → location.replace('landing.html')
```

쿼리 파라미터 없이 **referrer** 로 "랜딩을 이미 거쳤는지" 를 가른다. 그래서 헤더 로고/aside `메인` 링크는 원래대로 `./index.html`, 랜딩 카드도 `./index.html` / `{domain}/` 로 보낸다.

- 크로스 도메인 referrer 는 브라우저 기본 정책(`strict-origin-when-cross-origin`)상 origin 만 오므로 호스트로만 비교한다 (`www.` 유무 무시).
- 연결 숙소 B 의 랜딩 `about[]` 에 A 의 도메인이 없으면, A 랜딩 → B 카드 클릭 시 B 의 랜딩이 한 번 더 뜬다.
- https → http 로 넘어가면 브라우저가 referrer 를 보내지 않아 랜딩이 다시 뜬다 (연결 숙소 도메인은 https 전제).

### ⚠️ 부대시설 페이지 파일명 — `facility.html`

기존 템플릿(C/D/D2/E/F/L)은 `facility.html` 이지만 A 는 원본 사이트 메뉴(SPECIAL)에 맞춰 **`facility.html`** 을 쓴다.
**백오피스 페이지 키는 `facility` 그대로**(BFF 계약)이며, 파일명·클래스명만 다르다. `js/preview-handler.js` 3곳을 수정했다.

| 위치                  | 값                                                   |
| --------------------- | ---------------------------------------------------- |
| `PAGE_FILE_MAP`       | `facility: 'facility.html'`                          |
| `getCurrentPage()`    | `path.includes('facility.html')` → `'facility'` 반환 |
| 매퍼 레지스트리 (2곳) | `facility: 'FacilityMapper'`                         |

---

## 공통 상수 (`js/data-mapper/core/base-mapper.js`)

### 텍스트 정규화 — `cleanText()` / `firstText()`

백오피스는 **빈 값을 공백 한 칸(`' '`)으로 내려준다.** 그대로 두면 truthy 라서 폴백이 동작하지 않는다.
폴백 체인이 필요한 모든 곳에서 `firstText(a, b, c)` 를 쓴다 (앞에서부터 비어있지 않은 첫 값).

```js
hero.description = ' ';
hero.description || property.subtitle; // ✗ 공백이 선택됨
this.firstText(hero.description, property.subtitle); // ✓
```

### 숙소명이 문장에 들어가는 슬롯 — `applyPropertyCaptions()`

`[data-property-caption]` 속성에 템플릿 문자열을 두고 `{name}` / `{nameEn}` 을 치환한다. `\n` 은 `<br />` 로 바뀐다. `{nameEn}` 은 `getPropertyNameEn()` 결과를 쓴다.

```html
<p data-property-caption="{name}의 객실을 소개합니다."></p>
<p data-property-caption="조용하고 편안한 시간을 보낼 수 있는\n{name}"></p>
```

> ⚠️ **HTML 에 `<span data-property-name></span>의 객실을…` 형태로 두면 안 된다.**
> `.prettierrc` 의 `htmlWhitespaceSensitivity: "ignore"` 때문에 prettier 가 인라인 텍스트를 줄바꿈하고,
> 그 줄바꿈이 공백으로 렌더돼 **"펜션 의 객실을"** 처럼 조사 앞에 공백이 생긴다.
> 같은 이유로 푸터의 `T.` 접두어도 HTML 텍스트가 아니라 `.footer_wrap .footer .tel a::before` 로 붙인다.

### 객실명 — `getRoomtypeName()`

**`roomtypes[i]` 에 `name` 이 없고 `{id, images}` 만 오는 응답이 흔하다.** 이름은 `rooms[j]` 에만 있다.
같은 id 로 매칭되는 동일 엔티티이므로 폴백한다.

```js
firstText(roomtype.name, findRoomById(roomtype.id).name);
```

### 숙소 영문명 — `getPropertyNameEn()`

백오피스 custom field 값을 우선한다.

```
⚠️ **원본 사이트의 이름 슬롯은 두 개다.** 값이 같은 사이트가 많아 한 필드로 보이기 쉽다.

| 위치 | 필드 | 예) 경주 한옥스테이 | 예) 삼척 동해펜션 |
| --- | --- | --- | --- |
| index 히어로 `.main_txt_top strong` | `index.hero.title` | `한옥 스테이 다락` | `Donghae Pension` |
| `.pic_title` / room 교차 배너 / `Hello, X` / `Welcome to X` | `property.nameEn` | `HanokStayDarak` | `Donghae Pension` |

customFields.property.propertyUnameEn
  → customFields.property.propertyunameen
  → customFields.property.propertyNameEn
  → customFields.property.propertynameen
  → customFields.property.nameEn
  → property.nameEn
```

### totalRoomCount 한글 변환 — `formatRoomStructure()`

```js
const ROOM_COUNT_LABELS = {
  bedroom: '침대룸',
  bathroom: '화장실',
  livingRoom: '거실',
  ondol: '온돌룸',
  kitchen: '주방'
};
```

값이 1 이상인 항목만 나열하고 `roomStructures[0]` 과 조합한다.

```
roomStructures[0] + "/ " + 값≥1인 항목들 나열
예) "원룸형/ 침대룸 화장실 거실 주방"
```

### 평형 환산 — `toPyeong()`

`rooms[].size` 는 **제곱미터(㎡)** 다. 화면에는 평으로 환산해 노출한다.

```js
Math.round((sqm / 3.305785) * 10) / 10 + '평'; // 1평 = 3.305785㎡
```

### 객실 이미지 카테고리 — `getRoomtypeImages(roomtype, category)`

`roomtypes[i].images[].category` 로 구분한다. `isSelected` 우선, 없으면 카테고리 전체를 `sortOrder` 순으로 폴백.

| category             | 용도                             |
| -------------------- | -------------------------------- |
| `roomtype_thumbnail` | 목록 카드 썸네일                 |
| `roomtype_interior`  | 상세 히어로 슬라이더 / 교차 배너 |
| `roomtype_exterior`  | 상세 조각컷 (교차 배너 / 패럴랙스 / 와이드) — 비면 interior |

### 외부 전경 — `getLandscapeImages()`

원본 사이트의 **"외경보기(view.html)" 갤러리 소스**다.

> ⚠️ **원본은 ABOUT 하위가 `펜션소개`(about.html) + `외경보기`(view.html) 2개인데, 백오피스 페이지 편집 화면은 8개뿐이라 대응 화면이 `main` 하나다.** 그래서 두 페이지를 `main.html` 하나로 병합했다. (D·F 도 같은 상황을 같은 방식으로 처리한 전례가 있다)
>
> **메뉴명은 `펜션소개` 를 유지하고 페이지 내용은 `about.html` + `view.html` 을 합친다.** 필기체 라벨(`About` / `Landscape`)은 전부 정적이다. 데이터 배분은 아래 "숙소소개 이미지 칸" 을 따른다.

```
main.about[] (조각컷 블록 제외) .images[isSelected]  ← 블록 순서대로 평탄화 (중복 url 제거)
  → 비면 main.hero.images[isSelected] (배너 마커 제외)
  → 그래도 비면 getPropertyExteriorImages()
```

### 숙소소개 이미지 칸 — `getMainExteriorImages()` / `getGreetImages()` (2026-10 운영 요청)

백오피스 숙소소개 편집 화면에서 외경을 보고 고칠 수 있게 칸을 옮겼다. 화면에 나오는 사진·위치는 예전과 같다.

| 백오피스 칸                                   | main.html 영역                                        | 원본                          |
| --------------------------------------------- | ----------------------------------------------------- | ----------------------------- |
| 메인 소개 섹션 이미지 (`main.hero.images`)    | `.sub_visual_wide` 히어로 슬라이더 + `.about_img` 배너 (`description:'about_banner'`, 없으면 [0]) | view.html 외경 슬라이드 + about.html 배너 |
| 메인 소개 섹션 타이틀·설명                    | `.about_top` 인삿말 문구                              | about.html `.about_top`       |
| 소개 섹션 조각컷 블록 (이미지 `description:'about_greet'`) | `.about_top` 인삿말 옆 이미지 3장 — 갤러리·3분할에서는 뺀다 | about.html `.about_top .img_box` |
| 소개 섹션 나머지 블록                         | `.main_landscape` 갤러리 + `.main_pic` 문구·3분할      | about.html · view.html `.main_pic` |

**예전 크롤 데이터 폴백** (`isLegacyMainLayout()`): 조각컷 블록이 없고 숙소 외경 칸(`customFields.property.images` 의 `property_exterior`)에 크롤 외경이 있으면 예전 배치로 읽는다 — 외경 = 숙소 외경 칸, 조각컷 = 메인 소개 섹션 이미지. 재임포트 전까지 화면이 그대로다.
조각컷 블록이 없는 새 데이터(직접 만든 숙소)는 조각컷 자리에 외경 이미지를 쓴다. 메인 소개 섹션 이미지가 비면 숙소 외경 칸(숙소관리 DB 포함)으로 폴백한다.

### 숙소외경이미지 — `getPropertyExteriorImages()`

예전 크롤 데이터와 숙소관리 DB 의 외경 사진. 지금은 메인 소개 섹션 이미지가 없을 때의 폴백이다 (위 "숙소소개 이미지 칸").

데이터 모양 두 가지를 모두 받는다.

```
property.images[0].exterior[]                          (중첩형)
property.images[] 중 category === 'property_exterior'  (평탄형)
```

`index.html` 의 Healing Place 도 성격이 같아 **동일 소스**를 본다.

### 연락처 정규화 — `toPhoneList()`

`property.contactPhone` 은 **문자열 배열(`string[]`)**이다. 어떤 번호를 내려줄지는 BFF가 계약 타입을 보고 판단하므로 **템플릿은 받은 배열을 그대로 렌더링**하며 타입 분기를 두지 않는다. 배열/문자열/누락을 모두 문자열 배열로 정규화한다(빈 값이면 `['1833-9306']`).

---

## SEO / 메타 (전 페이지 공통)

`header-footer-mapper.updateMetaTags()` 가 `homepage.seo` 를 head 에 주입한다. 값이 없으면 태그를 만들지 않는다.

| 대상                                     | JSON 경로                                 |
| ---------------------------------------- | ----------------------------------------- |
| `<title data-page-title>`                | `homepage.seo.title`                      |
| `<meta name="description">`              | `homepage.seo.description`                |
| `<meta name="keywords">`                 | `homepage.seo.keywords`                   |
| `<meta name="naver-site-verification">`  | `homepage.seo.naverSiteVerification`      |
| `<meta name="google-site-verification">` | `homepage.seo.googleSiteVerification`     |
| `<link rel="icon">` (파비콘)             | `homepage.images[0].logo[isSelected].url` |

> **기본정보 로고 이미지는 파비콘·푸터에만 쓴다.** 헤더 로고 이미지는 별도 칸(`index.gallery`)을 쓴다 (아래 header 항목 참조).

---

## 테마 색상/폰트 (전 페이지 공통)

소스는 **`styles/theme.css` 의 `:root` 변수**다. 모든 CSS 가 `var(--color-*)` / `var(--font-*)` 를 참조하며, 테마 변경은 theme.css 만 고치면 된다.

> ⚠️ standalone(실제 페이지)은 **theme.css 를 그대로 사용**하고 JSON 으로 덮어쓰지 않는다. `homepage.customFields.theme` 을 적용하는 `applyThemeVariables()` 는 **백오피스 preview 에서만** 호출된다 (C/D2 와 동일).

### 색상 — primary = 밝은 바탕 / secondary = 진한 브랜드 포인트

형제 템플릿(C·D·D2·E·F·L) 및 백오피스 실제 값(`{ primary: "#F9F8F6", secondary: "#373737" }`)과 동일한 관례다.

| CSS 변수            | 기본값    | 적용                                                                | JSON 경로               |
| ------------------- | --------- | ------------------------------------------------------------------- | ----------------------- |
| `--color-primary`   | `#f9f8f6` | 밝은 바탕 면 (`.sub_cate_wrap` 등)                                  | `theme.color.primary`   |
| `--color-secondary` | `#c3a87f` | 브랜드 포인트 — `.logo2` / 예약버튼 / aside 배경 / `.main_pic` 배경 | `theme.color.secondary` |

> ⚠️ **parallax 구간의 조상(`#wrap` / `#container` / `.main_spe`)에는 배경을 넣지 말 것.**
> `parallax.js` 의 `.parallax-mirror` 는 `position:fixed` + `z-index:-100` 이라 페이지 요소 **뒤**에 깔린다.
> 조상에 불투명 배경이 생기면 미러가 가려져 `.main_spe` / `.about_img` / `.room_parallax` 이미지가 통째로 사라진다.
> 원본 사이트도 `#wrap` 에 background 가 없다.

`#6a747d`(제목·본문 텍스트, 13곳)와 `#505050`(`.main_title h3` / `.sub_title h3` 2곳)은 브랜드색이 아닌 **중립 텍스트색이라 하드코딩**으로 남겼다. 두 색은 `#6a747d` 로 통일했다.

### 폰트 — 원본이 "필기체"를 쓴 자리에만 en-main

| CSS 변수         | 기본값                     | 원본 서체                                                     | JSON 경로           |
| ---------------- | -------------------------- | ------------------------------------------------------------- | ------------------- |
| `--font-ko-main` | `'Noto Serif KR', serif`   | Lora / Nanum Myeongjo / Noto Serif KR (명조)                  | `theme.font.koMain` |
| `--font-ko-sub`  | `'Pretendard', sans-serif` | Noto Sans KR (본문)                                           | `theme.font.koSub`  |
| `--font-en-main` | `'Alex Brush', serif`      | KyoboHandwriting2021sjy / Alex Brush / Pinyon Script (필기체) | `theme.font.enMain` |

> `theme.font.enMain` 은 **`null` 로 오는 경우가 많다.** 그러면 로고·장식 제목의 실제 서체는 `theme.css` 의 `--font-en-main` 기본값이 결정한다.
> `--font-ko-sub` 는 백오피스가 실제로 내려주는 서체(Pretendard)와 맞춰 `@import` 로 로드해 뒀다. (D2·E 는 선언만 하고 로드를 빠뜨려 조용히 폴백된다)

**슬롯별 배분은 `styles/theme.css` 하단 주석에 표로 정리돼 있다.** 요지:

- `en-main` — 원본 필기체 + 한글이 들어오지 않는 자리 (로고, `getPropertyNameEn()`, 정적 영문 라벨)
- `ko-main` — (a) 원본이 명조였던 자리 (b) **원본은 필기체였으나 한글이 들어올 수 있는 자유입력 제목**
  필기체는 한글 글리프가 없어 generic serif 로 떨어지므로 제외한다 → 부대시설명 / `closing.title` / `about[].title` / 객실 제목
- `ko-sub` — 제목이 아닌 한글 본문 전부 (reset.css 가 body 에 지정)
- Arial 유지 — 원본의 정적 영문 라벨 `WELCOME TO PENSION` / `Read More`

---

## 팝업 (index.html 전용)

`styles/popup.css` + `js/popup.js`(`PopupManager`). **`index.html` 에만** 적용한다.

| 항목               | JSON 경로                                                                   |
| ------------------ | --------------------------------------------------------------------------- |
| 팝업 목록          | `homepage.customFields.popup.popups[]`                                      |
| 노출 여부          | `popups[i].enabled`                                                         |
| 표시 기간          | `popups[i].startDate` ~ `popups[i].endDate`                                 |
| 정렬               | `popups[i].sortOrder`                                                       |
| 이미지             | `popups[i].images[isSelected]` — **선택 이미지마다 박스 1개**를 동시에 표시 |
| 링크               | `popups[i].link`                                                            |
| 제목/설명 오버레이 | `popups[i].title` / `popups[i].description`                                 |

**노출 조건**: `enabled === true` + 표시기간 내 + 선택 이미지 1장 이상 (+ 실사이트는 `오늘 숨김 아님`)

> ℹ️ **`popups[i].slider` 플래그는 사용하지 않는다.** `template-center-slider` 계열은 `slider === true` 일 때 슬라이더로 렌더하지만, `t-template-C/D/D2/E/F/L` 6종은 모두 이미지 1장당 박스 1개를 동시 노출하는 구조다. A 도 **t-template 계열 규약을 따른다.**

**동작 규칙**

- standalone: `popup.js` 가 `./standard-template-data.json` 을 직접 fetch
- 백오피스 미리보기: `window.parent !== window` 로 감지. `POPUP_UPDATE` 메시지 → `updateFromPreview()`.
  전체 데이터 갱신 시에도 반영하되 **페이로드에 `popup` 노드가 있을 때만** 갱신한다(`if (!popupNode) return`). 팝업과 무관한 수정으로 떠 있던 팝업이 닫히는 것을 막는 가드.
- **"오늘 하루 보지 않기"는 박스 단위**. `boxId = popupId + 이미지 index`, 저장 키 `popup_hidden_<boxId>`. **실사이트에서만 적용**하며 미리보기에서는 무시한다.

---

## common/header.html

### ⚠️ 로고는 이미지가 아니라 "텍스트"다

원본 사이트 두 곳 모두 `<img>` 없이 필기체 폰트를 입힌 순수 텍스트이며, **슬롯이 2개**다.

| 슬롯     | 위치      | 스타일                              | 내용                       |
| -------- | --------- | ----------------------------------- | -------------------------- |
| `.logo`  | 헤더 중앙 | 42px, 흰색, 2줄                     | `nameEn` + `<span>` `name` |
| `.logo2` | 헤더 좌측 | 40px, `var(--color-secondary)`, 1줄 | `nameEn`                   |

서체는 `--font-en-main` 하나로 제어된다. 로고 이미지(`homepage.images[0].logo`)는 **파비콘 주입에만** 쓴다.

### 헤더 로고 이미지 — `index.gallery` 칸 (원본 헤더가 이미지인 숙소만)

원본 헤더가 이미지인 숙소(아그니초시매·에벤에셀펜션·자연과사람들)는 크롤러가 그 로고를 `pages.index.sections[0].gallery.images` 에 넣는다.
A형은 `index.gallery` 를 안 써서 헤더 로고 칸으로 빌린다. 이 칸에 선택된 이미지가 있으면 `.logo` / `.logo2` 에 `.has-img` 가 붙어 텍스트 대신 이미지가 나가고, 비어 있으면 텍스트 그대로다.

- **기본정보 로고로 판단하지 않는다.** 2026-10 기준 기본정보 로고가 있는 A형 8곳 중 6곳이 원본 헤더가 텍스트다(파비콘·푸터용 업로드). 기본정보 로고로 바꾸면 이 숙소들 헤더가 바뀐다.
- **로고 한 장으로 두 자리** (E2 와 같은 방식). 원본은 흰 로고(`.logo`) + 어두운·컬러 로고(`.logo2`) 두 장인데 크롤러는 `.logo2`(원래 색)를 우선해 한 장만 넣는다.

| 자리      | 보이는 때                        | 표시                                 | 크기                          |
| --------- | -------------------------------- | ------------------------------------ | ----------------------------- |
| `.logo`   | PC 최상단(투명 헤더)             | `filter: brightness(0) invert(1)` 흰색 | 최대 높이 80 / 폭 340         |
| `.logo2`  | PC 스크롤(`.header.on`)          | 원래 색                              | 최대 높이 80 / 폭 260         |
| `.logo2`  | 860px 이하                       | 원래 색                              | 최대 높이 50 / 폭 200 (높이 고정 안 함 — 가로로 긴 로고 비율 유지) |

> 투명 배경이 아닌 사각 로고(JPG)는 `.logo` 에서 흰 사각형이 된다. 크롤로 들어오는 원본 로고는 투명 PNG 다.

> 구현 함정: `reset.css` 가 `b` 태그에도 `font-family: var(--font-ko-sub)` 를 **직접** 지정하므로,
> `<b data-property-name-en>` 은 부모 `.logo` 의 필기체를 덮어쓴다. `.header .logo a b` 에 en-main 을 재지정해야 한다.

### 긴 숙소명 대응 — `fitLogo()`

중앙 로고는 좌우 메뉴 사이 여백(`max-width:340px`)에 들어가야 한다. 필기체는 자간이 넓어 이름이 길면 SPECIAL/RESERVE 를 침범하므로 `nameEn` 글자 수를 보고 단계적으로 축소한다.

| 조건      | 클래스      | `.logo` 크기 |
| --------- | ----------- | ------------ |
| 18자 이하 | —           | 42px         |
| 19~28자   | `.is-long`  | 32px         |
| 29자 이상 | `.is-xlong` | 24px         |

### 매핑

| data-\* 속성                          | 요소                                                                           | JSON 경로                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `data-property-name-en`               | `.logo a b`, `.logo2 a`                                                        | `getPropertyNameEn()`                                                                                           |
| `data-property-name`                  | `.logo a span`                                                                 | `property.name`                                                                                                 |
| `data-header-logo`                    | `.logo .logo_img`, `.logo2 .logo_img`                                          | `index.gallery.images[isSelected][0]` — 있으면 텍스트 대신 이미지 (위 "헤더 로고 이미지" 참조)                   |
| `data-rooms-submenu`                  | ROOMS `.depth_box` + aside `.depth_list`                                       | `customFields.roomtypes[]` → `./room.html?room_id={id}` (동적 생성, `미리보기` li 뒤)                           |
| `data-special-submenu`                | SPECIAL `.depth_box` + aside                                                   | `property.facilities[]` → `./facility.html?id={id}` (컨테이너 비우고 동적 생성)                                 |
| `data-booking-link`                   | RESERVE / 예약하기 / `.btn_hd_res` / `.aside_ico02`                            | `property.realtimeBookingId` (`getBookingUrl()`, href 직접 주입)                                                |
| `data-travel-menu`                    | TRAVEL `<li>` (PC + aside)                                                     | `pages.nearbyAttractions.sections[0].enabled === false` → 숨김                                                  |
| `data-menu-id="layout-map"`           | ROOMS `미리보기` li                                                            | `pages.layoutMap.sections[0].enabled === false` (또는 섹션 없음) → 숨김                                         |
| `data-rooms-link`                     | 대메뉴 ROOMS `depth1_a`                                                        | `pages.layoutMap.sections[0].enabled` — 켜짐 → `layout-map.html` / 꺼짐 → 첫 객실 상세 (`getRoomsEntryLink()`)  |
| `data-footer-phone-link`              | `.aside_ico03` (전화 아이콘)                                                   | `property.contactPhone[0]` → `tel:` (번호 텍스트 슬롯이 없으므로 href 만)                                       |
| `data-homepage-socialLinks-blog`      | `.btn_hd_res.naver` (네이버 N, 예약하기 앞) + aside_btm 네이버 아이콘(메인 뒤) | `homepage.socialLinks.blog` (네이버 플레이스 주소) — 값 있으면 href + 노출, 없으면 `[data-social-wrap]` 째 숨김 |
| `data-homepage-socialLinks-instagram` | `.btn_hd_res.insta` (네이버 뒤) + aside_btm 인스타 아이콘(네이버 뒤)           | `homepage.socialLinks.instagram` — 값 있으면 href + 노출, 없으면 `[data-social-wrap]` 째 숨김                   |

> 이름 없는 객실타입/시설은 빈 메뉴 항목(여백)이 되므로 건너뛴다.

### 소셜 링크 — `mapSocialLinks()`

`homepage.socialLinks = { facebook, instagram, blog, youtube }` 4종을 `[data-homepage-socialLinks-{platform}]` 에 매핑한다 (`template-*` 와 같은 규약).
마크업은 **네이버(`blog`) · 인스타그램(`instagram`)** 두 가지이고, facebook / youtube 는 매칭 요소가 없다.

| 버튼   | 헤더(PC, 스크롤 후)                               | aside 하단 아이콘               | 근거                                                   |
| ------ | ------------------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| 네이버 | `.btn_hd_res.naver` — 예약하기 앞, `n_logo.png`   | 메인 뒤, `n_w_logo.png`(흰색 N) | 원본(솔비치·동막스파·오션11) 마크업·CSS 그대로         |
| 인스타 | `.btn_hd_res.insta` — 네이버 뒤, `insta_logo.png` | 네이버 뒤, `insta_logo.png`     | 원본 A 에는 없음 → 네이버 버튼과 같은 방식·크기로 추가 |

- 래퍼(`[data-social-wrap]`)는 마크업에서 `style="display: none"` 으로 시작한다 → 매핑 전 깜빡임 없음. 값이 있으면 inline display 를 지워 CSS 에 맡긴다.
- PC 헤더 버튼은 원본과 같이 **스크롤 후(`.header.on`)에만** 보이고 860px 이하에서는 숨는다. 모바일은 aside 하단 아이콘으로 노출된다.
- 크기: 네이버는 원본 `width:18%`(200px → 36px), 인스타는 같은 36px 높이로 고정. 861~1023px 에서는 둘이 함께 떠도 예약하기가 줄바꿈되지 않도록 네이버 이미지를 `width:36px` 로 고정한다(보이는 크기 동일).
- aside 하단 아이콘이 최대 5개가 되므로 479px 이하에서는 간격 10px(flex + gap)로 줄이고, 더 좁으면 가운데 정렬로 줄바꿈된다.
- 어드민 프리뷰 `section_update` 의 `section === 'socialLinks'` 는 `pages[page].sections[0]` 이 아니라 `homepage.socialLinks` 에 반영하고 `mapSocialLinks()` 만 다시 돌린다.

---

## common/footer.html

| data-\* 속성                  | 요소                               | JSON 경로                                                                 |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| `data-footer-phone`           | `.tel` 번호 텍스트 `<span>`        | `property.contactPhone` (배열 항목)                                       |
| `data-footer-phone-link`      | `.tel` 전화번호 `<a>`              | `property.contactPhone` — 번호 개수만큼 `<a>` 복제, `" \| "` 로 구분 노출 |
| `data-footer-address`         | 주소 `<span>`                      | `property.businessInfo.businessAddress`                                   |
| `data-footer-business-name`   | 업체명 `<span>`                    | `property.businessInfo.businessName`                                      |
| `data-footer-representative`  | 대표자 `<span>`                    | `property.businessInfo.representativeName`                                |
| `data-footer-business-number` | 사업자번호 `<span>`                | `property.businessInfo.businessNumber`                                    |
| `.privacy` (첫 번째)          | 개인정보처리방침 `<a>`             | 정적 — `http://design.trip11.net/privacy/privacy_policy.html` (원본과 동일) |
| `data-ybs-button`             | 야놀자 YBS `<a>`                   | `property.ybsId` (없으면 YBS `.privacy` 박스만 숨김)                      |
| `data-booking-link`           | `.ft_btn_reserve` 실시간 예약 버튼 | `property.realtimeBookingId`                                              |
| `.copy`                       | 카피라이트 문구                    | `property.tripProviderName` → 없으면 정적 문구                    |

> ⚠️ **전화번호 소스 주의**: `businessInfo.businessPhone`(사업자 등록 전화번호)이 아니라 `property.contactPhone`(홈페이지 노출용 번호 배열)을 쓴다.
>
> ℹ️ 개인정보처리방침은 숙소별 값이 아니라 원본 두 사이트 모두 트립일레븐 공용 약관 URL 을 고정으로 건다. 그래서 매핑 없이 정적 링크로 둔다 (D · F · G 등 다른 템플릿과 같은 URL). 카피라이트는 `tripProviderName` 이 없으면 트립일레븐 정적 문구로 노출한다.

---

## landing.html (선택 기능 — 여러 숙소 게이트)

> 헤더/푸터가 없는 별도 페이지다. 아직 숙소를 고르기 전 화면이라 특정 숙소의 내비게이션(ABOUT/ROOMS/SPECIAL 등)을 보여줄 수 없다. himongpoolvilla.kr(3카드) / haimom(2카드) 형태의 "여러 숙소 게이트" 참고.
> `pages.landing.sections[0].enabled === true` 일 때 `index.html` 진입이 이 페이지로 리다이렉트된다 (위 "랜딩 게이트" 참고). `landing.html` 을 직접 열었는데 `enabled !== true`(또는 섹션 자체가 없음)면 `404.html` 로 리다이렉트한다 — `nearbyAttractions`/`layoutMap` 과 동일 규약.

| data-\* 속성          | 요소                | JSON 경로                                             |
| ---------------------- | ------------------- | ------------------------------------------------------ |
| `data-landing-cards`   | `ul.landing_cards`  | `pages.landing.sections[0].about[]` (li 동적 생성, 1~3장) |

### 카드 내부 구조

```
about[i] 기준으로 동적 생성 (li.landing_card > a):
- .landing_card_bg      : about[i].images[isSelected] 첫 장 (배경)
- .landing_card_overlay : 정적 오버레이
- .landing_card_content
    - 로고 있으면 <img class="landing_card_logo_img"> : hero.images[] 중 blockId === about[i].blockId
      (카드마다 다른 로고를 hero.images 공유 배열에서 blockId 로 스코프)
    - 로고 없으면 <p class="landing_card_name"> : about[i].propertyName
    - about[i].title 이 입력돼 있을 때만 <p class="landing_card_title"> 추가 (자동 채움 없음)
```

`ul` 의 `data-count` 속성 = `min(카드 수, 3)` — 그리드 컬럼 수 결정.

### `standard-template-data.json` — `pages.landing` 스키마

```json
"landing": {
  "sections": [
    {
      "enabled": true,
      "hero": { "images": [] },
      "about": [
        {
          "blockId": "sample-card-1",
          "propertyId": "sample-property-1",
          "propertyName": "현재 숙소",
          "title": "",
          "images": [],
          "order": 1
        },
        {
          "blockId": "sample-card-2",
          "propertyId": "sample-property-2",
          "propertyName": "연결 숙소 2",
          "domain": "http://localhost:8000/t-template-A",
          "title": "",
          "images": [],
          "order": 2
        }
      ]
    }
  ]
}
```

| 필드                | 용도                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| `about[i].blockId`  | `hero.images[]` 공유 배열에서 이 카드의 로고를 찾는 스코프 키           |
| `about[i].propertyId` | 이 사이트의 `property.id` 와 비교 — 같으면 "자기 자신" 카드            |
| `about[i].propertyName` | 로고가 없을 때 대신 보여줄 텍스트                                    |
| `about[i].domain`   | 연결 숙소(자기 자신이 아닌 카드)의 실제 도메인 — **어드민이 숙소 선택 시 저장해 내려준다고 전제**. 아직 백오피스 저장 로직 미구현 |
| `about[i].title`    | 카드에 추가로 보여줄 소개 문구 (선택 입력)                              |
| `about[i].images`   | 카드 배경 이미지 (카드별 전용 필드, `hero.images` 와 별개)              |
| `about[i].order`    | 카드 정렬 순서                                                         |

### 카드 클릭 링크 — `getCardLink()`

모든 카드는 **새 탭**으로 열리며(랜딩 자체는 원래 탭에 남김), 도착한 index 는 referrer 로 랜딩을 건너뛴다 (위 "랜딩 게이트" 참고).

| 조건                                             | 이동 링크                                  |
| -------------------------------------------------- | -------------------------------------------- |
| `about[i].propertyId === property.id` (자기 자신) | `./index.html` (새 탭)                       |
| 그 외 (연결 숙소) + `domain` 있음                  | `{정규화된 domain}/` (새 탭)                 |
| 연결 숙소인데 `domain` 없음                        | `href="#"` (비활성 링크)                     |

`domain` 정규화: `http(s)://` 없으면 `https://` 를 붙이고, 끝의 `/` 는 정리한다.

---

## index.html

| data-\* 속성                     | 요소                                                     | JSON 경로                                                                   |
| -------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `data-index-hero-slides`         | `.main_visual .swiper-wrapper`                           | `pages.index.sections[0].hero.images[isSelected]` (배경 슬라이드 동적 생성) |
| `data-index-hero-title`          | `.main_txt_top strong`                                   | `index.hero.title` → 폴백 `getPropertyNameEn()`                             |
| `data-index-hero-logo`           | `.main_txt_top .hero_logo`                               | `index.essence.images[isSelected][0]` — 있으면 WELCOME 줄·strong 대신 로고 (원본 히어로 표시명 자리가 이미지인 숙소만, 아그니초시매). 641px 이상 최대 420×220 / 640px 이하 200×105 |
| `data-property-name-en`          | `.main_pic .pic_title`                                   | `getPropertyNameEn()`                                                       |
| `data-index-hero-description`    | `.main_txt_top p`                                        | `hero.description` → 폴백 `property.subtitle` (`firstText`)                 |
| `data-property-name`             | `.main_title p span`, `.land_btm p span`                 | `property.name`                                                             |
| `data-index-room-slides`         | `.main_room .swiper-container_special .swiper-wrapper`   | `customFields.roomtypes[]` × `rooms[]` id 매칭                              |
| `data-index-special-list`        | `.main_spe .spe_list`                                    | `property.facilities[0..2]` (최대 3개)                                       |
| `data-index-landscape-slides`    | `.main_landscape .swiper-container_room .swiper-wrapper` | `getLandscapeImages()`                                                      |
| `data-index-closing-images`      | `.main_pic .pic_list` (`img01`/`img02`/`img03`)          | `pages.index.sections[0].closing.images[isSelected][0..2]`                  |
| `data-index-closing-title`       | `.main_pic .txt_box strong`                              | `closing.title` → 폴백 `"Welcome to {getPropertyNameEn()}"`                 |
| `data-index-closing-description` | `.main_pic .txt_box p`                                   | `closing.description` (`\n`→`<br>`) → 폴백 `CLOSING_FALLBACK_DESC_HTML`     |
| —                                | `#popup-container`                                       | `customFields.popup.popups[]`                                               |

### `data-index-room-slides` 슬라이드 내부 구조

```
roomtypes[i] 기준으로 동적 생성:
- <a class="spe_list" href="./room.html?room_id={id}">
- .img        : roomtype_thumbnail 첫 장 (없으면 roomtype_interior 첫 장) background
- .img_over   : images/more.png 고정
- .t01        : "Detail Room" 고정
- .t02        : getRoomtypeName(rt)          ← roomtypes[i].name → rooms[j].name 폴백
- .t03        : formatRoomStructure(rooms[j]) ← "원룸형/ 침대룸 화장실 거실 주방"
- .t04        : "Read More" 고정
```

### `data-index-special-list` 항목 내부 구조

```
property.facilities[0..2] 기준으로 동적 생성 (최대 3개, 3개 이하면 있는 만큼):
- .parallax-window[data-parallax="scroll"][data-image-src={images[0].url}]
- <a class="spe_in_txt" href="./facility.html?id={id}">
- <strong> : firstText(nameEn, name)
- <p>      : nameEn 이 있을 때만 name, 없으면 숨김   ← 시설 설명은 쓰지 않는다
```

> **`<p>` 는 원래 한글 시설명 자리였다.** 원본은 `strong`=영문명 / `p`=한글명 구조지만, `facilities[]` 에 `nameEn` 이 없는 응답이 일반적이라 `strong` 이 한글명으로 폴백되면서 `p` 가 같은 이름을 반복하게 된다.
> 그래서 `nameEn` 이 실제로 있어 `strong` 이 영문일 때만 원본대로 `p` 에 한글명을 넣고, 아니면 `p` 를 숨겨 중복 노출을 막는다. **시설 설명(`description`)은 이 영역에 쓰지 않는다.**

> ⚠️ **`.parallax-window` 에 `background-image` 를 직접 주지 말 것.** `.parallax-mirror` 가 `z-index:-100` 이라 요소 자신의 배경에 가려져 패럴랙스가 죽고 `cover` 크롭만 남는다.
> CSS 폴백은 `common.js` 의 `initParallax()` 가 **`$.fn.parallax` 가 없을 때만** 건다.

### closing 블록 — 데이터 우선 + 폴백

하단 와이드 배너(`.main_pic`)는 **`index.closing` 을 `index.html` 과 `main.html` 이 공유**한다.
백오피스에서 값을 넣으면 그 값이, 비어 있으면 원본 사이트의 템플릿 기본 카피가 나온다.

```
strong : closing.title       → "Welcome to {getPropertyNameEn()}"
p      : closing.description → BaseDataMapper.CLOSING_FALLBACK_DESC_HTML
                               "Stays with sea views in all rooms have crispy duvets and cute props.
                                <br />There is also a panoramic sea view and sunshine every morning."
```

폴백 문구는 `<br />` 를 포함한 HTML 이라 `nl2br()` 이스케이프를 거치지 않고 `innerHTML` 로 직접 넣는다.
데이터 경로는 이스케이프한다.

> 폰트: `.main_pic .txt_box strong` 은 **`var(--font-en-main), var(--font-ko-main)` 스택**이다.
> 폴백이 영문이라 로고와 같은 필기체로 나오고, 백오피스에서 한글을 넣으면 글자 단위로 ko-main 으로 떨어진다.
> `en-main` 단독으로 두면 한글에 글리프가 없어 generic serif 로 깨진다.

### 슬라이더 초기화

슬라이드는 매퍼가 동적 생성하므로, `mapPage()` 말미에서 `window.initIndexSwipers()` / `window.initParallax()` 를 호출한다.
`window.TplSwiper.init(key, selector, options)` 는 같은 컨테이너에 인스턴스가 있으면 destroy 후 재생성하고, 슬라이드가 0개면 초기화하지 않는다.
슬라이드 수가 한 화면 최대 칸 수(Room Preview 는 3)보다 적으면 **loop 를 끄고 칸 수를 슬라이드 수로 줄여** 영역 폭을 나눠 채운다 (1개면 100%, 2개면 50%씩). loop 를 켜 두면 빈칸을 복제 카드로 채워 객실 1개 숙소에서 같은 카드가 3장 보인다. 화살표는 Swiper 가 잠가(`swiper-button-lock`) 숨긴다. index / room / layout-map 의 Room Preview 가 모두 해당된다.

| 키               | 대상                                     | 설정                                         |
| ---------------- | ---------------------------------------- | -------------------------------------------- |
| `indexVisual`    | `.main_visual_box .swiper-container`     | loop, fade, autoplay 4s, `.arw_left/right`   |
| `indexRoom`      | `.main_room .swiper-container_special`   | loop, 3 → 2 → 1 (961/480), `.arw_left/right` |
| `indexLandscape` | `.main_landscape .swiper-container_room` | loop, fade, autoplay 4s                      |

> 원본 `custom.js` 는 **Swiper 3 API**(`nextButton` / `prevButton` / `autoplay: 4000`)로 작성돼 있으면서 Swiper 8 을 로드하는 상태였다. A 는 Swiper 8 기준(`navigation: {nextEl, prevEl}`, `autoplay: {delay}`)으로 재작성했다.

---

## main.html (= ABOUT / 펜션소개)

> **메뉴명은 `펜션소개` 를 유지하고, 페이지 내용은 원본 `about.html`(펜션소개) + `view.html`(외경보기) 두 페이지를 합친 구조다.**
> 백오피스 페이지 편집 화면이 8개뿐이라 `view.html` 에 대응하는 화면이 없어 `main` 하나로 합쳤다.
> 섹션 클래스는 원본 view.html 과 같은 **`sub1_2 sub_about`** 이다 — `.land_btm` 의 `display_main` 을 숨기고 `display_view`만 노출하는 규칙이 여기에 걸려 있다.

| data-\* 속성                     | 요소                                                     | JSON 경로                                                                                |
| -------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `data-main-hero-slides`          | `.sub_visual_box .swiper-wrapper`                        | `getMainExteriorImages()` — 메인 소개 섹션 이미지 **전부** (배너 마커 제외)             |
| `data-main-hero-title`           | `.about_top .about_txt_box strong`                       | `main.hero.title`                                                                        |
| `data-main-hero-description`     | `.about_top .about_txt_box p`                            | `main.hero.description` → 폴백 `property.subtitle`                                       |
| `data-main-hero-images`          | `.about_top .img_box`                                    | `getGreetImages()` — 소개 섹션 조각컷 블록 → `img01`(30%/450px) + `img02`·`img03`(22%/220px) |
| `data-main-exterior-banner`      | `.about_img .parallax-window`                            | `getExteriorBannerImage()` — 메인 소개 섹션 중 `description:'about_banner'` (없으면 **[0]**) |
| `data-main-landscape-slides`     | `.main_landscape .swiper-container_room .swiper-wrapper` | `getLandscapeImages()` — `main.about[].images` 평탄화 (조각컷 블록 제외)                 |
| `data-main-about-blocks`         | `.main_pic`                                              | `main.about[]` (조각컷 블록 제외) 블록마다 `.about_txt_box(strong+p)` + `.pic_box>.pic_list(img01~03)` 생성 |
| `data-index-closing-title`       | `.main_pic .txt_box strong`                              | `index.closing.title` → 폴백 `"Welcome to {getPropertyNameEn()}"`                        |
| `data-index-closing-description` | `.main_pic .txt_box p`                                   | `index.closing.description` → 폴백 `CLOSING_FALLBACK_DESC_HTML`                          |

### 필기체 슬롯은 전부 정적이다

`--font-en-main` 슬롯에는 데이터를 넣지 않는다. 한글이 들어가면 크기(50~100px)와 폰트 때문에 레이아웃이 깨진다. room.html 히어로와 같은 규약이다.

| 요소                              | 크기  | 고정 문구            |
| --------------------------------- | ----- | -------------------- |
| `.main_txt_top span`              | 18px  | `WELCOME TO PENSION` |
| `.main_txt_top strong`            | 75px  | `About`              |
| `.main_landscape .sub_title h3`   | 50px  | `Landscape`          |
| `.land_btm strong.display_view`   | 100px | `Landscape`          |

`.main_txt_top p` 와 `.main_landscape .sub_title p` 는 `data-property-caption` 으로 숙소명만 치환한다. 숙소별 한글 문구는 `--font-ko-main` 30px 슬롯인 `.about_txt_box strong` / `p` 가 맡는다.

### 데이터 배분

| 원본 페이지          | 데이터 소스                  | main.html 영역                                    |
| -------------------- | ---------------------------- | ------------------------------------------------- |
| `view.html` 슬라이더 | `main.hero.images`           | `.sub_visual_wide` 히어로 + `.about_img` 배너     |
| `about.html` 상단    | `main.hero` 문구 + 조각컷 블록 | `.about_top` 인삿말 (제목 · 본문 · 이미지 3장)    |
| `about.html`+`view.html` 본문 | `main.about[]`      | `.main_landscape` 갤러리 + `.main_pic` 문구·3분할 |
| —                    | `index.closing`              | 맨 아래 Welcome 밴드 (index / room 과 공유)       |

> `about.html` 의 parallax 배너에 붙어 있던 `Welcome to {nameEn}` 문구는 `index.closing` 과 같은 값이라 `about[]` 에 넣지 않는다. 넣으면 한 페이지에 같은 문구가 두 번 나온다 (배너 + 하단 밴드).
> `WELCOME,` 워터마크는 `.sub_about .about_img:before` 가 CSS 로 그린다 — 데이터가 아니다.

### 하단 문구가 비었을 때

`.about_txt_box` 를 만들지 않고 해당 `.pic_box` 에 **`.no-txt`** 를 붙인다. `.pic_box` 가 `margin-top:-220px` 로 이 텍스트 위에 겹쳐 올라오는 구조라, 텍스트가 사라지면 겹침을 해제해야 레이아웃이 깨지지 않는다.

```css
.main_pic .pic_box.no-txt {
  margin-top: 0;
}
```

### 슬라이더 초기화

| 키              | 대상                                     | 설정                                               |
| --------------- | ---------------------------------------- | -------------------------------------------------- |
| `mainHero`      | `.sub_visual_box .swiper-container`      | loop, fade, autoplay 4s, `.sub_visual_wide .arw_*` |
| `mainLandscape` | `.main_landscape .swiper-container_room` | loop, fade, autoplay 4s                            |

> `.about_img` 배너가 패럴랙스라 `js/parallax.js` 를 로드한다. 매핑이 `data-image-src` 를 주입한 뒤 `window.initParallax()` 를 호출해야 배경이 붙는다.

---

## layout-map.html (= ROOMS / 미리보기)

> 원본 `room.html`(room_id 없는 목록 화면). ROOMS 대메뉴의 랜딩이며 "미리보기" 링크 대상.
> 백오피스 편집 화면 라벨은 **"배치도 (선택)"** — `layoutMap.hero` 가 페이지 히어로, `layoutMap.about` 이 하단 배치도 이미지다.
> 별도 `room-list.html` 은 두지 않는다 — **백오피스에 `roomList` 편집 화면이 없다** (D/E/F/L/D2 와 동일).

| data-\* 속성              | 요소                                                   | JSON 경로                                                                        |
| ------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `data-layout-map-hero-bg` | `.sub_visual` (background-image)                       | `layoutMap.hero.images[isSelected][0].url` → 폴백 `property.images[0].thumbnail` |
| `data-property-caption`   | `.sub_visual .txt_box span`, `.main_title p`           | `{name}` → `property.name`                                                       |
| `data-room-list-nav`      | `.sub_cate_wrap ul`                                    | `roomtypes[]` (동적 생성, `미리보기` li 뒤)                                      |
| `data-room-list-slides`   | `.main_room .swiper-container_special .swiper-wrapper` | `roomtypes[]` × `rooms[]` (공용 렌더러)                                          |
| `data-layout-map-image`   | `.sub_img_box_wide img`                                | `layoutMap.about.images[isSelected]` 전체                                        |
| `data-layout-map-wrap`    | 배치도 영역 전체                                       | 이미지가 없으면 **영역 통째로 숨김**                                             |

### enabled 체크

`layoutMap.sections[0].enabled === false` **또는 섹션 자체가 없으면** → `404.html` 리다이렉트. 헤더 `미리보기` li 도 같은 기준으로 숨긴다.

**대메뉴 `ROOMS`(`[data-rooms-link]`)는 이 값에 따라 이동처가 갈린다.** — `getRoomsEntryLink()`

| `layoutMap` | ROOMS 클릭 시                                     |
| ----------- | ------------------------------------------------- |
| 켜짐        | `layout-map.html` (객실 배치도)                   |
| 꺼짐        | 첫 번째 객실 상세 (헤더 객실 메뉴 첫 항목과 같음) |

꺼진 상태에서 그대로 두면 `layout-map.html` 이 404 로 튕긴다. 판정은 이 페이지의 404 기준과 같은
`isLayoutMapEnabled()`(섹션 없음 / `enabled:false` → 꺼짐)를 쓴다. `room.html` 의 객실 탭 첫 칸
`미리보기` 도 꺼져 있으면 숨긴다. 객실이 하나도 없으면 원래 href 를 둔다.

### 배치도 이미지는 `<img>` 로 넣는다

`.sub_img_box_wide .img` 는 `height:550px` + `background-size:cover` 라 **도면이 잘린다.** 배치도는 전체가 보여야 하므로 `<img>` 로 바꾸고 `.layout_map_wide` 클래스로 `max-width:100%; height:auto` 를 준다.

---

## room.html (`?room_id=`, preview 는 `?id=`)

> `?room_id=` 가 없으면 `roomtypes[0]` 을 보여준다. 백오피스 preview 는 `?id=` 로 보내므로 **둘 다 받는다.**

| data-\* 속성                                  | 요소                                                     | JSON 경로                                                    |
| --------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| `data-room-name`                              | `.main_txt_top p`, `.sub_title2 h3`, 표 `td` (PC+모바일) | `roomtypes[current].name` → `rooms[j].name` 폴백             |
| `data-room-hero-slides`                       | `.sub_visual_box .swiper-wrapper`                        | `roomtypes[current]` **interior 전체** (없으면 thumbnail)    |
| `data-room-list-nav`                          | `.sub_cate_wrap ul`                                      | `roomtypes[]` (현재 객실 `.on`)                              |
| `data-room-base-occupancy` / `-max-occupancy` | 표 `td` (PC+모바일)                                      | `rooms[j].baseOccupancy` / `.maxOccupancy`                   |
| `data-room-structure`                         | 표 `td` (PC+모바일)                                      | `formatRoomStructure(rooms[j])`                              |
| `data-room-size-pyeong`                       | 표 `td` (PC only)                                        | `rooms[j].size`(㎡) → `toPyeong()`                           |
| `data-room-amenities`                         | `.table_text li span` (PC+모바일)                        | `rooms[j].amenities.join(', ')`                              |
| `data-booking-url`                            | `a.btn_reserve`                                          | `property.realtimeBookingId`                                 |
| `data-room-bnr-images`                        | 1차 `.sub_img_box li` **2개 고정**                       | 조각컷 `[0..1]`                                              |
| `data-room-bnr-title`                         | `.txt_box strong`                                        | `getPropertyNameEn()` 고정 — 원본과 동일. 객실명이 아니다    |
| `data-room-bnr-description`                   | `.txt_box p` (배너·와이드 공용)                          | interior `[0].description` (자리 표시면 무시) → 폴백 `BNR_FALLBACK_DESC_HTML` |
| `data-room-parallax`                          | `.room_parallax .parallax-window`                        | 조각컷 `[2]` → 폴백 `[0]`                                    |
| `data-room-gallery`                           | 2차 `.sub_img_box li` **2개 고정**                       | 조각컷 `[3..4]`                                              |
| `data-room-wide-image`                        | `.sub_img_box_wide .img`                                 | 조각컷 `[5]` → 폴백 `[1]`                                    |
| `data-room-hello-title`                       | `.sub_img_box_wide .txt_box strong`                      | `"Hello, {getPropertyNameEn()}"` (원본 카피)                 |
| `data-index-closing-title` / `-description`   | `.room_parallax .txt_box`                                | `index.closing.*` (index/main 과 공유)                       |
| `data-room-floorplan-section`                 | `.room_floorplan`                                        | 평면도 이미지가 없으면 섹션 전체 미노출                      |
| `data-room-floorplan-image`                   | `.room_floorplan img`                                    | 원본 객실 상세 페이지의 평면도 영역에서 크롤링된 이미지      |
| `data-room-list-slides`                       | 하단 `.main_room .swiper-wrapper`                        | `roomtypes[]` (index / layout-map 과 동일)                   |

### 히어로 영역은 원본 그대로 정적이다

```html
<span>Room Information</span>
<strong>Preview</strong>
<!-- 정적 하드코딩 (75px) — 모든 객실 동일 -->
<p data-room-name></p>
<!-- 객실명 (18px) -->
```

> `strong` 을 객실명으로 바꾸지 않는다. 원본 사이트가 이 자리를 고정 라벨로 쓰며, 객실명은 아래 `.sub_title2 h3` 에서 크게 다시 노출된다. `.sub_visual_wide .main_txt_top strong` 은 정적 영문이므로 `--font-en-main` 단독이다.

### 객실 이미지 배분 — 히어로는 내부 이미지, 조각컷은 컨셉 및 외경 (2026-10 운영 요청)

| 백오피스 객실 설정 칸 | 영역 |
| --- | --- |
| 내부 이미지 (`roomtype_interior`) | 히어로 슬라이더 **전부** (`sortOrder` 순) · 목록 카드 썸네일 폴백 |
| 컨셉 및 외경 (`roomtype_exterior`) | 조각컷 6자리 — 순서(`sortOrder`)가 곧 자리 |

| 컨셉 및 외경 순서 | 자리 표시 (`description`) | 영역 |
| --- | --- | --- |
| 1, 2 | `room_bnr1:0`, `room_bnr1:1` | 교차 배너 #1 (li 2개 고정) |
| 3 | `room_parallax:0` | 패럴랙스 밴드 |
| 4, 5 | `room_bnr2:0`, `room_bnr2:1` | 교차 배너 #2 (li 2개 고정) |
| 6 | `room_wide:0` | 와이드 이미지 |

- 자리 표시가 있으면 표시가 우선이고, 없으면 `sortOrder` 순서로 자리를 정한다. 모자라면 **앞에서부터 순환**해 빈 칸을 남기지 않는다.
- 원본은 슬롯마다 관리자가 고른 사진이라 순서에 규칙이 없고 대개 히어로 사진을 다시 쓴다 (동궁: 배너1=`6,4` · 패럴랙스=`5` · 배너2=`10,9` · 와이드=`7`). 그래서 같은 사진이 내부 이미지와 컨셉 및 외경 양쪽에 있다.
- **컨셉 및 외경이 비면 예전처럼 내부 이미지로 채운다** — 예전 크롤 데이터는 조각컷이 내부 이미지 안에 자리 표시(`room_bnr1:0` 등)로 들어 있다. 이 표시는 배너 문구로 쓰지 않는다 (예전에는 `room_parallax:0` 이 문구로 찍혔다).

원본 레이아웃이 `li` 2개 고정이라 개수를 늘리지 않는다. 백오피스에서 이미지를 몇 장 올려도 페이지 길이가 일정하게 유지된다.

### 객실 평면도

평면도는 일반 객실 이미지 URL만으로 판단하지 않는다. 크롤러가 원본 객실 상세 페이지의 평면도 HTML 영역을 별도로 탐지하고, 이미지가 있을 때만 아래 중 하나로 저장해야 노출한다.

| 지원 데이터 형태                                                                           | 비고            |
| ------------------------------------------------------------------------------------------ | --------------- |
| `roomtypes[current].floorplanImages[]`                                                     | 권장            |
| `roomtypes[current].floorplans[]`                                                          | 호환            |
| `roomtypes[current].floorplan.images[]`                                                    | 호환            |
| `roomtypes[current].images[].category = "roomtype_floorplan"`                              | 카테고리형 호환 |
| `roomtypes[current].images[].category = "floorplan"` / `"room_floorplan"` / `"floor_plan"` | 카테고리형 호환 |

해당 데이터가 없으면 `data-room-floorplan-section` 은 `display:none` 처리한다. `roomtype_interior`, `roomtype_thumbnail`, `roomtype_exterior` 의 이미지는 평면도 폴백으로 쓰지 않는다.

---

## facility.html (= SPECIAL / 부대시설, `?id=`)

> 원본 `special1~7.html`. 파일명만 `facility.html` 이고 **백오피스 페이지 키는 `facility`** 다.
> `?id=` 가 없으면 `facilities[0]`.

| data-\* 속성               | 요소                                     | JSON 경로                                                  |
| -------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `data-special-name-en`     | `.main_txt_top strong`, `.sub_title2 h3` | `facilities[current].nameEn` → `name`                      |
| `data-special-name`        | `.main_txt_top p`, `.sub_title2 p`       | `facilities[current].name` — **`nameEn` 이 없으면 숨김**   |
| `data-special-hero-slides` | `.sub_visual_box .swiper-wrapper`        | `facilities[current].images` (배경 슬라이드)               |
| `data-special-nav`         | `.sub_cate_wrap ul`                      | `facilities[]` (현재 `.on`, 이름 없으면 skip)              |
| `data-special-description` | `p.notice_txt`                           | `pages.facility.hero.title` → `description` → `usageGuide` |
| `data-special-images`      | `.sub_img_box li` **2개 고정**           | `images[0..1]`                                             |
| `data-special-wide-image`  | `.sub_img_box_wide .img`                 | `images[2]` → 폴백 `[0]`                                   |

### 이용안내 폴백 체인 — C·D·E·F·L 과 동일

```
pages.facility.sections[0].hero.title   ← 백오피스에서 직접 입력한 값 (1순위)
  → facilities[current].description
  → facilities[current].usageGuide
```

기존 템플릿 5종이 모두 `hero.title` 을 1순위로 둔다. 실데이터에서 **`description` 이 빈 문자열이고 `usageGuide` 에만 내용이 있는 경우가 흔해** 두 필드를 모두 봐야 한다.

> 원본은 `strong`=영문명 / `p`=한글명 구조지만 `facilities[]` 에 `nameEn` 이 없는 응답이 일반적이다. 그러면 `strong` 이 한글명으로 폴백되므로 **`p` 를 숨겨 같은 이름이 두 번 나오지 않게** 한다. (index 의 `.main_spe` 와 같은 원칙)

---

## reservation.html

| data-\* 속성                       | 요소                             | JSON 경로                                    |
| ---------------------------------- | -------------------------------- | -------------------------------------------- |
| `data-reservation-hero-image`      | `.sub_visual` (background-image) | `reservation.hero.images[isSelected][0].url` |
| `data-property-caption`            | `.sub_visual .txt_box span`      | `{name}` → `property.name`                   |
| `data-booking-url`                 | `.sub_cate_wrap a` (예약하기)    | `property.realtimeBookingId`                 |
| `data-reservation-info`            | 1번째 `dd`                       | `property.usageGuide`                        |
| `data-reservation-refund-policies` | 2번째 `dd`                       | `property.refundPolicies[]` (동적 생성)      |

### refundPolicies 렌더 규칙

스키마는 `[{ refundProcessingDays, refundRate }]` 다. 일수 **내림차순**으로 정렬해 한 줄씩 만든다.

```
* 이용일 10일 전 취소 시 100% 환불
* 이용일 9일 전 취소 시 90% 환불
...
* 이용일 당일 취소 시 환불 불가      ← days=0
```

`refundSettings.customerRefundNotice` 가 있으면 목록 아래에 덧붙인다.

---

## directions.html

| data-\* 속성                 | 요소                             | JSON 경로                                                         |
| ---------------------------- | -------------------------------- | ----------------------------------------------------------------- |
| `data-directions-hero-image` | `.sub_visual` (background-image) | `directions.hero.images[isSelected][0].url`                       |
| `data-property-caption`      | `.sub_visual .txt_box span`      | `{name}` → `property.name`                                        |
| `#kakao-map`                 | `.map > div`                     | `property.latitude` / `property.longitude`                        |
| `data-property-address`      | `.map_info strong`               | `property.address` (앞에 `주소 : ` 접두)                          |
| `data-directions-notice`     | `.map_info dl`                   | `directions.notice` → 항목당 `<dt>title</dt><dd>description</dd>` |

> 원본은 **daum roughmap 임베드**(사이트마다 고정 key)를 썼으나, 좌표 기반 `js/kakao-maps-sdk.js` 로 교체했다(다른 템플릿과 동일). SDK 로드를 최대 2초(100ms × 20회) 재시도한다.
>
> 좌표가 없으면 `.map` 영역은 유지하고 지도 생성만 건너뛴다. `notice` 는 객체/배열 둘 다 받는다.

---

## nearby-attractions.html

| data-\* 속성                   | 요소                             | JSON 경로                                                                    |
| ------------------------------ | -------------------------------- | ---------------------------------------------------------------------------- |
| `data-nearby-hero-image`       | `.sub_visual` (background-image) | `nearbyAttractions.hero.images[isSelected][0].url`                           |
| `data-property-caption`        | `.sub_visual .txt_box span`      | `{name}` → `property.name`                                                   |
| `data-nearby-title`            | `.sub_title2 h3`                 | `nearbyAttractions.sections[0].title` → `hero.title` → `Tourist Spot`        |
| `data-nearby-description`      | `.sub_title2 p`                  | `nearbyAttractions.sections[0].description` → `hero.description` → 기본 문구 |
| `data-nearby-attractions-list` | `.travel_list ul`                | `nearbyAttractions.sections[0].about[]` (동적 생성)                          |

### li 내부 구조

```
about[i] 기준:
- <img>    : about[i].images[isSelected][0].url
- <strong> : about[i].title                    (비면 숨김)
- <p>      : about[i].description (\n→<br>)
    └ <span> : images[isSelected][0].description
```

> ⚠️ 원본은 각 항목 `<p>` 안에 `(자료출처 : 대한민국 구석구석 …)` 를 두지만 `about[]` 스키마에 대응 필드가 없다. **매퍼가 문구를 만들어내지 않으며**, 출처가 필요하면 크롤러가 `description` 끝에 포함시켜 내려준다.

### enabled 체크

`nearbyAttractions.sections[0].enabled === false` **또는 섹션 자체가 없으면** → `404.html` 리다이렉트 + 헤더 TRAVEL 메뉴 숨김.

---

## 404.html

매핑 슬롯은 헤더/푸터뿐이다. `layout-map` / `nearby-attractions` 가 비활성일 때의 리다이렉트 대상.
색상·폰트는 `theme.css` 토큰(`--color-secondary`, `--font-en-main`)을 쓴다.

---

## 페이지별 스크립트 (`js/pages/*.js`)

슬라이드는 매퍼가 **동적 생성**하므로, 각 매퍼의 `mapPage()` 말미에서 초기화 함수를 호출한다.
`window.TplSwiper.init(key, selector, options)` 는 같은 컨테이너에 인스턴스가 있으면 destroy 후 재생성하고, 슬라이드가 0개면 초기화하지 않는다.

| 파일                                                         | 초기화 함수            | 대상                                             |
| ------------------------------------------------------------ | ---------------------- | ------------------------------------------------ |
| `index.js`                                                   | `initIndexSwipers`     | 비주얼(fade) / 객실(3→2→1) / Healing Place(fade) |
| `main.js`                                                    | `initMainSwipers`      | 히어로(fade) / 외경 갤러리(fade)                 |
| `layout-map.js`                                              | `initLayoutMapSwipers` | 객실(3→2→1)                                      |
| `room.js`                                                    | `initRoomSwipers`      | 히어로(fade) / 하단 객실(3→2→1)                  |
| `special.js`                                                 | `initFacilitySwipers`  | 히어로(fade)                                     |
| `reservation.js` / `directions.js` / `nearby-attractions.js` | —                      | 없음 (자리만 확보)                               |
| `landing.js`                                                  | —                       | 없음 (자리만 확보) — 헤더/푸터 없는 게이트 페이지라 `common.js` 에 얹힐 게 없음 |

패럴랙스가 있는 페이지(`index` / `room`)는 `window.initParallax()` 도 함께 호출한다. `main.html` 은 패럴랙스를 쓰지 않는다.

> 원본 `custom.js` 는 **Swiper 3 API**(`nextButton` / `prevButton` / `autoplay: 4000`)로 작성돼 있으면서 Swiper 8 을 로드하는 상태였다. A 는 Swiper 8 기준(`navigation: {nextEl, prevEl}`, `autoplay: {delay}`)으로 재작성했다.

---

## 헤더 서브메뉴 스크롤

객실/시설이 많아 서브메뉴가 뷰포트를 넘치면 그 박스만 스크롤한다. `js/common.js` 의 `openLnb()` 가 처리한다.

```
cap = max(160, 뷰포트높이 - 헤더높이 - 80)
박스 scrollHeight > cap → .is-scroll + max-height:cap  (그 박스만 스크롤)
```

`overscroll-behavior: contain` 으로 뒤 페이지가 따라 움직이지 않게 하고, 창 크기 변경 시 열려 있으면 상한을 다시 계산한다. 닫을 때 인라인 `max-height` 를 지워 CSS 의 닫힘 트랜지션을 살린다. 모바일 aside 는 `.aisde_inner { overflow-y:auto }` 라 별도 처리가 필요 없다.

---


### 메뉴 순서는 `pages.room[]` 이 정한다

원본은 순서를 두 벌 갖는다.

| 영역 | 순서 | 소스 |
| --- | --- | --- |
| 헤더 ROOMS 메뉴 | 그룹 순서 | `pages.room[]` 배열 순서 |
| 본문 Room's Preview | 카드 순서 | `roomtypes[]` 배열 순서 |

둘을 같은 배열에서 파생하면 한쪽이 원본과 어긋난다. `roomtypes[]` 에 순서 필드를 더 넣을 수는 없다 — 어드민 `homepage-transformer` 가 roomtypes 에서 `id`/`name`/`nameEn`/`groupName`/`images` 만 남기고 나머지를 버린다. `pages` 는 통째로 보존되므로 배열 순서가 유일하게 살아남는 신호다.

`sortRoomMenuItems()` 가 각 메뉴 항목을 그 그룹 객실이 `pages.room[]` 에 처음 나오는 위치로 정렬한다. `pages.room` 이 없으면 종전처럼 `roomtypes[]` 등장 순서를 쓴다.


### 객실 상세 슬롯은 `description` 마커로 정한다

원본은 객실 사진을 다섯 군데에 나눠 쓰는데, 어느 사진이 어디 가는지 규칙이 없다 — 객실마다 관리자가 손으로 고른다.

| 객실 | 배너#1 | 패럴랙스 | 배너#2 | 와이드 |
| --- | --- | --- | --- | --- |
| bibiart 31386 | 6, 1 | 10 | 8, 3 | 12 |
| bibiart 31393 | 4, 6 | 1 | 5, 2 | 3 |
| jpension 26167 | 1, 2 | 5 | 2, 4 | 12 |

그래서 크롤러가 원본에서 읽어 `roomtype_interior` 이미지의 `description` 에 마커를 단다.

```
room_bnr1:0  room_bnr1:1   교차 배너 #1 (슬롯 안 순서까지 담는다)
room_parallax:0            패럴랙스
room_bnr2:0  room_bnr2:1   교차 배너 #2
room_wide:0                와이드
```

배열 위치를 쓰지 않는 이유: 어드민이 이미지 배열을 화면 상태로 재조립하면서 순서가 `sortOrder` 기준으로 바뀐다. 히어로는 `sortOrder` 로 그려서 살아남지만 슬롯은 깨진다. 마커가 없는 예전 데이터는 종전처럼 배열 위치(`[0..1]`/`[2]`/`[3..4]`/`[5]`)로 폴백한다.

같은 사진을 두 슬롯에 쓰는 원본이 있어(jpension: 배너1 `[1,2]` · 배너2 `[2,4]`), 그때는 마커를 단 항목이 하나 더 생긴다.

## 객실 그룹 규칙 (`groupName`)

`roomtypes[].groupName`이 **하나라도 있으면** 그룹 모드로
동작한다. 없으면 객실 하나가 항목 하나다. 규칙은 `base-mapper.js` 한 곳에 있다.

**그룹으로 접히는 곳은 헤더 ROOMS 메뉴와 객실 상세 탭뿐이다.**
Room Preview(미리보기) 카드는 그룹과 무관하게 **항상 전체 객실**을 깔고,
카드마다 자기 객실 상세로 연결한다 — 원본이 그렇다.

| 함수                     | 역할                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| `hasRoomGroups()`        | `groupName` 이 하나라도 있는지                                            |
| `getRoomMenuItems()`     | 그룹 단위 항목 배열 — `{ label, groupName, roomtype(대표), roomtypes[] }` |
| `getRoomMenuLabel()`     | 메뉴에 쓸 이름 — **그룹명** (없으면 객실명)                               |
| `getRoomMenuLink()`      | **그룹의 첫 객실** 상세로 연결                                            |
| `isRoomMenuItemActive()` | 그룹 안 **어느 객실 id 로 들어와도** 그 항목을 활성으로 본다              |
| `renderRoomSlides()`     | 미리보기 카드 — **그룹을 쓰지 않고 `roomtypes[]` 전체**를 깐다            |

### 화면 흐름

```
헤더 ROOMS 메뉴        →  그룹명        (스파동 | 프리미엄동)
        ↓ 그룹명 클릭
그룹의 첫 번째 객실 상세 →  탭에 그 그룹의 모든 객실
                          (미리보기 | 에버골드 | 퍼블하제 | 유메)

Room Preview(미리보기)  →  전체 객실 (그룹과 무관), 카드마다 자기 객실 상세로 연결
```

### ⚠️ 객실 상세 탭은 그룹을 펼친다

헤더 ROOMS 메뉴는 그룹명 하나로 접히므로, **상세 페이지 탭까지 접으면 그룹의 첫 객실
외에는 헤더로 도달할 방법이 없다.** 그래서 탭은 현재 객실이 속한 그룹을 찾아
**그 그룹의 객실만** 렌더한다.

| 상황                             | 탭                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| 그룹 밖 (미리보기 / 미그룹 객실) | `미리보기 \| 스파동 \| 프리미엄동 \| …`                                            |
| 그룹 안 (멤버 2실 이상)          | `미리보기 \| 에버골드 \| 퍼블하제 \| 유메`                                         |
| 멤버 1실 그룹                    | 펼치지 않음 — 항목이 하나뿐이라 탭이 비다시피 하고 그룹명 = 객실명이라 의미가 없다 |
| `groupName` 없음                 | 기존과 동일 (객실 하나가 항목 하나)                                                |

**다른 그룹은 이 줄에 섞지 않는다.** 그룹명과 객실명이 나란히 놓이면 부모/자식이
형제처럼 보인다. 다른 그룹으로는 헤더 ROOMS 메뉴나 미리보기를 거쳐 이동한다.
(미리보기에서는 어느 객실이든 바로 갈 수 있다.)

탭을 다시 그릴 때 **첫 li(`미리보기`)는 남기고** `data-generated="room"` 이 붙은
이전 생성분만 지운다. 통째로 비우면 미리보기로 돌아갈 길이 없어진다.

---

## 카피라이트 (`data-copyright`)

푸터 카피라이트는 `property.tripProviderName`(Trip11 공급자명)으로 렌더한다.

`common/footer.html` 의 카피라이트 요소에 템플릿 문자열을 두고,
`header-footer-mapper.js` 의 `mapCopyright()` 가 `{provider}` 를 치환한다.

```html
<a href="http://trip11.kr/" data-copyright="COPYRIGHT©{provider}. ALL RIGHTS RESERVED.">
  COPYRIGHT©(주)트립일레븐. ALL RIGHTS RESERVED.
</a>
```

| `property.tripProviderName` | 결과                                  |
| --------------------------- | ------------------------------------- |
| `"신비서"`                  | `COPYRIGHT©신비서. ALL RIGHTS RESERVED.` |
| `""` / 미입력               | HTML 에 적힌 기존 문구 그대로          |

- 문구 형식(대소문자, `ⓒ` 접두, `(주)` 표기)은 템플릿마다 달라서 **형식은 `data-copyright` 속성값이 갖고
  매퍼는 이름만 바꾼다**.
- 값이 없을 때(백오피스 미입력 → `""`) 는 건드리지 않으므로 기존 트립일레븐 문구가 그대로 남는다.
- `trip11.kr` 링크는 변경하지 않는다.
