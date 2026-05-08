/** 第四篇章 iframe 与主站样式中的横向缩放系数一致（1560 → 约 800px 视口） */
const CHAPTER4_IFRAME_SCALE = 0.5128;
const CHAPTER4_IFRAME_WIDTH_PX = 1560;
const CHAPTER4_IFRAME_DEFAULT_DOC_H = 1120;

function parseIframeDocHeightPx(heightVal, fallback = CHAPTER4_IFRAME_DEFAULT_DOC_H) {
  if (heightVal == null || heightVal === "") return fallback;
  const s = String(heightVal).trim();
  const pxMatch = /^([\d.]+)\s*px$/i.exec(s);
  if (pxMatch) {
    const n = Number(pxMatch[1]);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum > 0) return asNum;
  return fallback;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 已在 escapeHtml 之后的纯文本上操作；将 NYC 五区中文名包一层 strong */
function wrapNycBoroughNamesBold(escapedPlain) {
  const names = ["曼哈顿", "皇后区", "布鲁克林", "布朗克斯", "史泰登岛"];
  let s = escapedPlain;
  for (const n of names) {
    const esc = escapeHtml(n);
    if (!esc || !s.includes(esc)) continue;
    s = s.split(esc).join(`<strong>${esc}</strong>`);
  }
  return s;
}

function paragraphChartProseInnerHtml(step) {
  const raw = escapeHtml(step.text ?? "");
  if (step.type === "paragraph" && step.heading === "城市人文底色综合分析") {
    return wrapNycBoroughNamesBold(raw);
  }
  return raw;
}

function getIframeList(chapter) {
  if (Array.isArray(chapter.iframes) && chapter.iframes.length) return chapter.iframes;
  return [
    {
      src: chapter.iframeSrc,
      title: chapter.iframeTitle,
      height: chapter.iframeHeight
    }
  ];
}

function renderGuideHtml(chapter) {
  return chapter.guide?.length
    ? `
      <aside class="guide-card">
        <h4>交互指南</h4>
        <ol>${chapter.guide.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </aside>`
    : "";
}

function renderBulletTree(items) {
  if (!items || !items.length) return "";
  return items
    .map((item) => {
      if (typeof item === "string") return `<li>${escapeHtml(item)}</li>`;
      if (item && typeof item.intro === "string" && Array.isArray(item.children)) {
        const inner = item.children.map((c) => `<li>${escapeHtml(c)}</li>`).join("");
        return `<li><p class="nested-bullet-intro">${escapeHtml(item.intro)}</p><ul class="insight-list insight-list--nested">${inner}</ul></li>`;
      }
      return "";
    })
    .join("");
}

function renderIframeWrap(frame, chapterIdx) {
  const heightStyle = frame.height ? `height:${frame.height};` : "";
  if (chapterIdx === 3) {
    const docH = parseIframeDocHeightPx(frame.height);
    const clipH = docH * CHAPTER4_IFRAME_SCALE;
    return `
      <div class="iframe-wrap iframe-wrap--scaled">
        <div class="iframe-scale-inner" style="height:${clipH}px">
          <iframe
            src="${frame.src}"
            title="${escapeHtml(frame.title)}"
            loading="lazy"
            scrolling="no"
            style="width:${CHAPTER4_IFRAME_WIDTH_PX}px;height:${docH}px;transform:scale(${CHAPTER4_IFRAME_SCALE});transform-origin:0 0;"
          ></iframe>
        </div>
      </div>`;
  }

  return `
      <div class="iframe-wrap">
        <iframe
          src="${frame.src}"
          title="${escapeHtml(frame.title)}"
          loading="lazy"
          scrolling="no"
          style="${heightStyle}"
        ></iframe>
      </div>`;
}

function renderChapterFlow(chapter, chapterIdx) {
  const iframeList = getIframeList(chapter);
  const guideHtml = renderGuideHtml(chapter);
  const header = `
    <article class="text-block">
      <h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>
      ${chapter.subtitle ? `<p class="chapter-subtitle">${escapeHtml(chapter.subtitle)}</p>` : ""}
      <p class="intent">${escapeHtml(chapter.intent)}</p>
      ${guideHtml}
    </article>`;

  const body = chapter.flow
    .map((step) => {
      if (step.type === "iframe") {
        const frame = iframeList[step.index];
        if (!frame) return "";
        return renderIframeWrap(frame, chapterIdx);
      }
      if (step.type === "chartCaption") {
        const ul = renderBulletTree(step.items || []);
        return `
    <article class="text-block chart-note">
      <ul class="insight-list">${ul}</ul>
    </article>`;
      }
      if (step.type === "paragraph") {
        const heading = step.heading
          ? `<h4 class="flow-inline-heading">${escapeHtml(step.heading)}</h4>`
          : "";
        return `
    <article class="text-block chart-note chart-note--prose">
      ${heading}
      <p class="chart-prose">${paragraphChartProseInnerHtml(step)}</p>
    </article>`;
      }
      if (step.type === "chartProse") {
        return `
    <article class="text-block chart-note chart-note--prose">
      <p class="chart-prose">${escapeHtml(step.text)}</p>
    </article>`;
      }
      if (step.type === "closing") {
        const ul = (step.items || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
        return `
    <article class="text-block chapter-closing">
      <p class="closing-lead">${escapeHtml(step.lead)}</p>
      <ul class="insight-list">${ul}</ul>
    </article>`;
      }
      return "";
    })
    .join("");

  return header + body;
}

async function loadData() {
  const v = Date.now();
  // 只请求主配置，不再请求假画像的 JSON
  const siteRes = await fetch(`./data/site-content.json?v=${v}`, { cache: "no-store" });
  
  return {
    site: await siteRes.json(),
    chart: [] // 塞一个空数组，骗过下面的渲染逻辑，防止 JS 报错白屏
  };
}
function renderHero(hero) {
  const root = document.querySelector("#hero");
  root.innerHTML = `
    <div class="hero-inner">
      <h1 class="hero-title">${hero.title}</h1>
      ${hero.paragraphs.map((p) => `<p>${p}</p>`).join("")}
    </div>
    <a href="#chapter-1" class="scroll-indicator" aria-label="向下滚动阅读">
      <span>向下滑动</span>
      <span class="arrow" aria-hidden="true"></span>
    </a>
  `;
}

function renderChapter(chapter, idx) {
  const section = document.createElement("section");
  section.className = `chapter chapter--${idx + 1}`;
  section.id = `chapter-${idx + 1}`;

  if (chapter.flow && chapter.flow.length) {
    section.innerHTML = renderChapterFlow(chapter, idx);
    return section;
  }

  const guideHtml = chapter.guide?.length
    ? `
      <aside class="guide-card">
        <h4>交互指南</h4>
        <ol>${chapter.guide.map((item) => `<li>${item}</li>`).join("")}</ol>
      </aside>`
    : "";

  const insights = (chapter.insights || []).map((i) => `<li>${i}</li>`).join("");

  const iframeList = Array.isArray(chapter.iframes) && chapter.iframes.length
    ? chapter.iframes
    : [
        {
          src: chapter.iframeSrc,
          title: chapter.iframeTitle,
          height: chapter.iframeHeight
        }
      ];

  const iframeHtml = iframeList
    .map((frame) => {
      const heightStyle = frame.height ? `height:${frame.height};` : "";
      if (idx === 3) {
        const docH = parseIframeDocHeightPx(frame.height);
        const clipH = docH * CHAPTER4_IFRAME_SCALE;
        return `
      <div class="iframe-wrap iframe-wrap--scaled">
        <div class="iframe-scale-inner" style="height:${clipH}px">
          <iframe
            src="${frame.src}"
            title="${frame.title}"
            loading="lazy"
            scrolling="no"
            style="width:${CHAPTER4_IFRAME_WIDTH_PX}px;height:${docH}px;transform:scale(${CHAPTER4_IFRAME_SCALE});transform-origin:0 0;"
          ></iframe>
        </div>
      </div>`;
      }

      return `
      <div class="iframe-wrap">
        <iframe
          src="${frame.src}"
          title="${frame.title}"
          loading="lazy"
          scrolling="no"
          style="${heightStyle}"
        ></iframe>
      </div>`;
    })
    .join("");

  section.innerHTML = `
    <article class="text-block">
      <h2 class="chapter-title">${chapter.title}</h2>
      <p class="intent">${chapter.intent}</p>
      ${guideHtml}
    </article>
    ${iframeHtml}
    <article class="text-block">
      <p class="insight-lead"><strong>数据洞察：</strong>${chapter.insightLead || ""}</p>
      <ul class="insight-list">${insights}</ul>
    </article>
  `;
  return section;
}

function renderFinale(finale) {
  const section = document.createElement("section");
  section.className = "chapter";
  section.id = "chapter-finale";

  // 1. 彻底删除了假画像 (chartData) 的渲染逻辑
  // 2. 加入了安全判定 (?.)，防止 JSON 中缺少某些字段时报错

  section.innerHTML = `
    <article class="text-block">
      <h2 class="chapter-title">${finale.title || ""}</h2>
      ${finale.topParagraphs?.map((p) => `<p>${p}</p>`).join("") || ""}
      
      ${finale.profiles && finale.profiles.length > 0 
        ? `<ul class="insight-list">${finale.profiles.map((p) => `<li>${p}</li>`).join("")}</ul>` 
        : ""}
        
      ${finale.closing ? `<p>${finale.closing}</p>` : ""}
    </article>
  `;
  return section;
}

async function init() {
  const { site, chart } = await loadData();
  renderHero(site.hero);
  const main = document.querySelector("#main-content");
  site.chapters.forEach((chapter, idx) => main.appendChild(renderChapter(chapter, idx)));
  main.appendChild(renderFinale(site.finale, chart));
}

init().catch((err) => {
  console.error(err);
  const main = document.querySelector("#main-content");
  main.innerHTML = "<p class='text-block'>内容加载失败，请检查 data 目录文件路径。</p>";
});
