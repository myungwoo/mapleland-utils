# 🍁 메이플랜드 유틸 모음

메이플랜드 유틸들을 한 도메인으로 모은 사이트입니다.
**<https://mapleland.myungwoo.kr>**

| 유틸 | 주소 | 소스 |
| --- | --- | --- |
| 🗡️ 데미지 계산기 | [/damage](https://mapleland.myungwoo.kr/damage/) | [damage-calculator](https://github.com/myungwoo/damage-calculator) |
| 🍁 주문서 강화 분석기 | [/enhance](https://mapleland.myungwoo.kr/enhance/) | [mapleland-enhance-analyzer](https://github.com/myungwoo/mapleland-enhance-analyzer) |
| 📈 경험치 측정기 | [/exp](https://mapleland.myungwoo.kr/exp/) | [mapleland-exp-tracker-web](https://github.com/myungwoo/mapleland-exp-tracker-web) |
| ⏱️ 사냥 타이머 | [/hunt](https://mapleland.myungwoo.kr/hunt/) | [mapleland-timer](https://github.com/myungwoo/mapleland-timer) |
| 💰 공대 분배 계산기 | [/split](https://mapleland.myungwoo.kr/split/) | [group-allocator](https://github.com/myungwoo/group-allocator) |

## 어떻게 한 도메인에 모이나

GitHub Pages 는 **하나의 커스텀 도메인을 하나의 사이트에만** 붙일 수 있습니다.
그래서 각 유틸 리포에 `CNAME` 을 나눠 붙이는 방식은 불가능합니다.

대신 이 리포가 도메인을 소유하고, 배포할 때 각 유틸 리포를 체크아웃해
`/<슬러그>` 하위 경로로 빌드한 뒤 한 덩어리로 올립니다.

```
dist/
├── index.html                  ← 랜딩 페이지 (scripts/build-site.mjs 가 생성)
├── 404.html
├── CNAME
├── damage/                     ← damage-calculator 를 basePath=/damage 로 빌드한 결과
├── enhance/
├── exp/
├── hunt/
├── split/
└── damage-calculator/          ← 리포 이름으로 들어온 주소 → /damage 리다이렉트
    └── ...
```

각 유틸 리포의 자체 배포(`myungwoo.github.io/<repo>`)는 그대로 살아 있습니다.
두 경로 모두 같은 소스에서 나옵니다.

빌드하는 쪽이 하위 경로를 정할 수 있어야 하므로, 각 유틸의 `next.config` 는
`NEXT_PUBLIC_BASE_PATH` 환경변수로 `basePath` 를 받습니다.

## 유틸 추가·수정

`utils.json` 만 고치면 됩니다. 랜딩 페이지 카드, 배포 대상, 리다이렉트가 모두
여기서 나옵니다.

```jsonc
{
  "slug": "damage",        // 사이트에서 쓸 경로 (/damage)
  "repo": "damage-calculator",
  "ref": "main",           // 빌드할 브랜치/태그
  "emoji": "🗡️",
  "name": "데미지 계산기",
  "summary": "카드에 들어갈 한두 문장",
  "highlights": ["카드 하단 태그", "3개 정도"]
}
```

새 유틸 리포는 `NEXT_PUBLIC_BASE_PATH` 를 읽어 `basePath` 를 정하고
`output: "export"` 로 `out/` 을 내보내야 합니다.

## 로컬에서 확인

```bash
node scripts/build-site.mjs   # dist/ 에 랜딩 페이지 생성
npx serve dist                # 또는 python3 -m http.server -d dist
```

유틸 본체까지 포함한 사이트 전체는 배포 워크플로가 조립합니다.
랜딩 페이지만 볼 때는 유틸 카드 링크가 404 로 뜨는 게 정상입니다.

## 배포

`main` 에 푸시하면 배포됩니다.

유틸 리포가 업데이트되어도 이 리포에는 푸시가 없으므로, 각 유틸의 배포 워크플로가
마지막에 이 리포로 `repository_dispatch`(`utils-updated`) 를 보내 재빌드를 트리거합니다.
유틸 리포에는 이 리포에 대한 Contents 쓰기 권한만 가진 fine-grained PAT 를
`MAPLELAND_UTILS_DISPATCH` 시크릿으로 넣어 둡니다.

매일 03:00(KST) cron 은 알림이 유실되거나 PAT 가 만료됐을 때를 위한 안전망입니다.
즉시 반영이 필요하면 Actions 에서 **Deploy** 를 수동 실행하세요.

### 도메인 설정 (한 번만)

1. DNS: `mapleland` CNAME → `myungwoo.github.io`
   (`*.myungwoo.kr` 와일드카드가 있으므로, `mapleland` 명시 레코드로 덮어써야 합니다)
2. 이 리포 Settings → Pages → Source: **GitHub Actions**,
   Custom domain: `mapleland.myungwoo.kr`
3. 인증서가 발급되면 Enforce HTTPS 체크
