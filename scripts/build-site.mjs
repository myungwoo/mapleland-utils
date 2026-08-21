// 랜딩 페이지와 리다이렉트 페이지를 utils.json 하나에서 만들어 냅니다.
//
// 왜 생성하는가: 유틸 목록이 랜딩 페이지 HTML 과 배포 워크플로 양쪽에 필요합니다.
// 두 곳에 손으로 적으면 유틸을 추가할 때 한쪽만 고치고 끝나서 반드시 어긋납니다.
// 목록은 utils.json 에만 있고, 이 스크립트와 워크플로가 각각 읽어 갑니다.
//
// 각 유틸의 실제 빌드 결과(dist/<slug>/)는 워크플로가 채웁니다.

import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const { site, utils } = JSON.parse(await readFile(join(root, "utils.json"), "utf8"));

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

const write = async (relPath, contents) => {
  const target = join(dist, relPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
};

const styles = `
:root {
  color-scheme: light dark;
  --bg: #fbf8f3;
  --bg-card: #ffffff;
  --border: #e8e0d4;
  --border-hover: #d8a34a;
  --text: #24211d;
  --text-dim: #6b6459;
  --accent: #b8641d;
  --tag-bg: #f3ece1;
  --shadow: 0 1px 2px rgb(36 33 29 / 6%), 0 8px 24px -12px rgb(36 33 29 / 12%);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #17150f;
    --bg-card: #211e17;
    --border: #332e24;
    --border-hover: #a9752c;
    --text: #f0ebe2;
    --text-dim: #a49b8c;
    --accent: #e8a94f;
    --tag-bg: #2b2619;
    --shadow: 0 1px 2px rgb(0 0 0 / 30%), 0 8px 24px -12px rgb(0 0 0 / 60%);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: clamp(2.5rem, 8vw, 5.5rem) 1.25rem 4rem;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard",
    "Segoe UI", "Malgun Gothic", system-ui, sans-serif;
  line-height: 1.65;
  -webkit-text-size-adjust: 100%;
}
.wrap { max-width: 62rem; margin: 0 auto; }
header { margin-bottom: clamp(2rem, 5vw, 3.25rem); }
h1 {
  margin: 0 0 0.6rem;
  font-size: clamp(1.75rem, 5vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}
.tagline { margin: 0; max-width: 40rem; color: var(--text-dim); font-size: 1.05rem; }
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
}
.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.4rem 1.5rem 1.5rem;
  border: 1px solid var(--border);
  border-radius: 0.9rem;
  background: var(--bg-card);
  box-shadow: var(--shadow);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.card:hover, .card:focus-visible {
  border-color: var(--border-hover);
  transform: translateY(-2px);
  outline: none;
}
.card-head { display: flex; align-items: center; gap: 0.6rem; }
.emoji { font-size: 1.6rem; line-height: 1; }
.name { margin: 0; font-size: 1.2rem; font-weight: 700; letter-spacing: -0.01em; }
.summary { margin: 0; color: var(--text-dim); font-size: 0.95rem; }
.tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: auto; padding-top: 0.35rem; }
.tag {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--tag-bg);
  color: var(--text-dim);
  font-size: 0.78rem;
  white-space: nowrap;
}
.go { color: var(--accent); font-size: 0.9rem; font-weight: 600; }
footer {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 0.88rem;
}
footer a { color: var(--accent); }
.repos { margin: 0.5rem 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; }
`.trim();

// 유틸은 새 탭에서 연다. 이 목록으로 돌아오기 쉬운 것도 있지만, 유틸마다 자기
// 파비콘이 있어서 같은 탭에서 열면 돌아온 뒤에도 그 아이콘이 탭에 남는다.
// rel="noopener" 는 새 탭이 window.opener 로 이 페이지를 만지지 못하게 막는다.
/**
 * 파비콘.
 *
 * 이 사이트만 자기 아이콘을 가진다. 각 유틸은 자기 파비콘을 그대로 쓰므로,
 * 유틸에서 랜딩으로 돌아오면 아이콘이 이 M 마크로 바뀐다.
 *
 * - SVG: 최신 브라우저용. 배율에 상관없이 또렷하다.
 * - 32px PNG: SVG 파비콘을 모르는 구형 브라우저용 폴백.
 * - apple-touch-icon: iOS 홈 화면용. 모서리는 iOS 가 깎으므로 정사각 꽉 찬 바탕이다.
 *
 * 파일은 assets/ 에 있고, PNG 는 favicon.svg 에서 뽑은 것이다(만드는 방법은 CLAUDE.md).
 */
const icons = `<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">`;

const card = (u) => `
      <a class="card" href="/${esc(u.slug)}/" target="_blank" rel="noopener">
        <span class="card-head">
          <span class="emoji" aria-hidden="true">${esc(u.emoji)}</span>
          <h2 class="name">${esc(u.name)}</h2>
        </span>
        <p class="summary">${esc(u.summary)}</p>
        <span class="tags">${u.highlights
          .map((h) => `<span class="tag">${esc(h)}</span>`)
          .join("")}</span>
        <span class="go">새 탭에서 열기 ↗</span>
      </a>`;

const indexHtml = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.title)}</title>
<meta name="description" content="${esc(site.tagline)}">
<meta property="og:title" content="${esc(site.title)}">
<meta property="og:description" content="${esc(site.tagline)}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://${esc(site.domain)}/">
<link rel="canonical" href="https://${esc(site.domain)}/">
${icons}
<style>
${styles}
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>🍁 ${esc(site.title)}</h1>
      <p class="tagline">${esc(site.tagline)}</p>
    </header>
    <main class="grid">${utils.map(card).join("")}
    </main>
    <footer>
      <p>전부 정적 웹앱입니다. 서버로 보내는 데이터가 없고, 소스는 모두 공개되어 있습니다.</p>
      <ul class="repos">${utils
        .map(
          (u) =>
            `<li><a href="https://github.com/${esc(site.owner)}/${esc(u.repo)}" target="_blank" rel="noopener">${esc(u.name)} 소스</a></li>`
        )
        .join("")}
      </ul>
    </footer>
  </div>
</body>
</html>
`;

const notFoundHtml = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>없는 주소입니다 · ${esc(site.title)}</title>
${icons}
<style>
${styles}
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>없는 주소입니다</h1>
      <p class="tagline">주소를 잘못 입력하셨거나, 옮겨진 유틸일 수 있습니다. 아래에서 골라 주세요.</p>
    </header>
    <main class="grid">${utils.map(card).join("")}
    </main>
  </div>
</body>
</html>
`;

// 리포 이름으로 들어온 주소를 짧은 슬러그로 넘깁니다.
// 예전에 공유한 링크(myungwoo.github.io/<repo> 를 이 도메인으로 바꿔 적은 주소)가
// 깨지지 않게 하는 안전장치입니다. 정식 주소는 슬러그 쪽입니다.
const redirectHtml = (slug) => {
  const target = `/${slug}/`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(target)} 로 이동합니다</title>
<link rel="canonical" href="https://${esc(site.domain)}${esc(target)}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<script>
  location.replace(${JSON.stringify(target)} + location.search + location.hash);
</script>
</head>
<body>
<p><a href="${esc(target)}">${esc(target)} 로 이동</a></p>
</body>
</html>
`;
};

await mkdir(dist, { recursive: true });
await write("index.html", indexHtml);
await write("404.html", notFoundHtml);
await write("CNAME", `${site.domain}\n`);
// Pages 는 업로드한 산출물을 그대로 서비스하지만, Jekyll 처리가 끼어들어
// Next 의 _next/ 디렉터리가 사라지는 일을 확실히 막아 둡니다.
await write(".nojekyll", "");

// 파비콘 자산을 그대로 옮긴다. assets/ 에 파일을 추가하면 자동으로 따라온다.
const assetsDir = join(root, "assets");
for (const name of await readdir(assetsDir)) {
  await copyFile(join(assetsDir, name), join(dist, name));
}

for (const u of utils) {
  if (u.repo === u.slug) continue;
  await write(join(u.repo, "index.html"), redirectHtml(u.slug));
}

console.log(
  `랜딩 페이지 생성 완료: ${utils.length}개 유틸, 리다이렉트 ${
    utils.filter((u) => u.repo !== u.slug).length
  }개, 자산 ${(await readdir(assetsDir)).length}개`
);
