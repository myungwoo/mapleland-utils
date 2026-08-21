# 메이플랜드 유틸 모음 (집계 사이트)

여러 리포에 흩어진 메이플랜드 유틸을 `mapleland.myungwoo.kr` 한 도메인으로 모아
배포하는 리포. 이 리포에는 앱 코드가 없다. **하는 일은 조립**이다.

```bash
node scripts/build-site.mjs        # dist/ 에 랜딩 · 404 · 리다이렉트 · CNAME 생성
python3 -m http.server -d dist     # 랜딩만 확인 (유틸 카드 링크는 404 로 뜨는 게 정상)
```

유틸 본체까지 포함한 사이트 전체는 `.github/workflows/deploy.yml` 이 조립한다.
각 유틸 리포를 clone → `NEXT_PUBLIC_BASE_PATH=/<슬러그>` 로 빌드 → `dist/<슬러그>/` 에 복사.

## 깨뜨리면 안 되는 것

### 1. 도메인은 이 리포만 소유한다

GitHub Pages 는 **하나의 커스텀 도메인을 하나의 사이트에만** 붙일 수 있다. 유틸 리포에
`mapleland.myungwoo.kr` CNAME 을 추가하면 도메인이 그 리포로 넘어가면서 이 사이트가
죽는다. 유틸을 하위 경로로 붙이는 방법은 여기서 함께 빌드하는 것뿐이다.

`dist/CNAME` 은 매 배포마다 생성한다. 이걸 빼면 Pages 의 Custom domain 설정이 배포와
함께 날아간다.

### 2. 유틸 목록의 단일 출처는 `utils.json`

랜딩 페이지 카드, 배포 대상, 리다이렉트가 모두 여기서 나온다. `dist/` 는 전부 산출물이니
`dist/index.html` 을 직접 고치지 말 것 — 다음 배포에 사라진다.

`scripts/build-site.mjs` 를 두는 이유가 이것이다. 목록을 HTML 과 워크플로 양쪽에 손으로
적으면 유틸을 추가할 때 한쪽만 고치고 끝나서 반드시 어긋난다.

### 3. 슬러그는 공개 주소다

`slug` 는 사람들이 공유하고 북마크하는 주소(`/damage`)다. 바꾸면 남이 공유해 둔 링크가
깨진다. 부득이하게 바꿀 때는 **옛 슬러그로 들어온 요청을 새 슬러그로 보내는 리다이렉트를
남긴다**. `build-site.mjs` 의 리다이렉트 생성부가 그 자리다(현재는 리포 이름 → 슬러그).

### 4. 유틸 리포에 요구되는 두 가지

새 유틸을 붙이려면 그 리포가 이걸 만족해야 한다. 아니면 `out/` 이 없어서 빌드가 죽는다.

- `basePath` 를 `NEXT_PUBLIC_BASE_PATH` 환경변수로 받는다.
- `output: "export"` 로 `out/` 을 내보낸다.

**함정:** `actions/configure-pages` 의 `static_site_generator: next` 를 쓰면, 그 액션이
`next.config.js` 를 새로 만들어 `output`/`basePath` 를 주입한다. Next 는 `next.config.js`
를 `next.config.ts` 보다 먼저 읽으므로 **리포의 `next.config.ts` 가 조용히 무시된다.**
`damage-calculator` 와 `mapleland-timer` 가 실제로 그 상태였다. 유틸 리포에서 설정이
안 먹는 것 같으면 이걸 먼저 의심할 것.

### 5. 유틸 리포 푸시는 이 사이트를 자동으로 갱신하지 않는다

유틸이 업데이트돼도 이 리포에는 푸시가 없다. 그래서 매일 03:00 KST cron 으로 다시
빌드한다. 즉시 반영은 Actions 에서 **Deploy** 수동 실행.

더 빠르게 하려면 각 유틸 리포가 이 리포로 `repository_dispatch` 를 보내야 하는데,
그러려면 유틸 리포마다 PAT 를 시크릿으로 넣어야 한다. 무료 플랜에서 관리 비용이 커서
지금은 cron 을 택했다. 바꾸려면 그 트레이드오프를 알고 바꿀 것.

### 6. 유틸의 에셋 경로는 슬러그에 묶여 있다

각 유틸 안에서 `"/alert.mp3"` 같은 루트 절대경로를 쓰면 `basePath` 를 안 타서 슬러그가
바뀌는 순간 깨진다. 상대경로(`"./alert.mp3"`)나 `NEXT_PUBLIC_BASE_PATH` 를 붙여 쓸 것.
워크플로의 확인 단계가 `dist/<슬러그>/index.html` 의 `_next` 경로만 검사하므로,
그 외 에셋은 이 규칙으로 막는다.

### 7. 랜딩 페이지에 프레임워크를 들이지 않는다

지금 랜딩은 의존성 0, 빌드 0(노드 표준 라이브러리만)이다. 카드 다섯 장을 그리는 일에
번들러를 붙이면 이 리포의 CI 가 유틸 5개 빌드 + 자기 빌드로 늘어난다. 스타일은
`build-site.mjs` 안의 인라인 CSS 하나로 유지한다.

## 배포 한 번만 하는 설정

1. DNS: `mapleland` CNAME → `myungwoo.github.io`
2. Settings → Pages → Source: **GitHub Actions**, Custom domain: `mapleland.myungwoo.kr`
3. Enforce HTTPS
