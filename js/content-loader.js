/* ============================================================
   破薪阁 — 内容加载引擎
   从 content/*.json 动态加载数据并渲染到页面
   ============================================================ */

const ContentLoader = (() => {
  const BASE = ""; // GitHub Pages 根路径

  /* --- 工具：fetch JSON 并缓存 --- */
  async function fetchJSON(path) {
    const key = "pxg_" + path;
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    const res = await fetch(BASE + path);
    if (!res.ok) throw new Error("加载失败: " + path);
    const data = await res.json();
    sessionStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  /* --- 加载所有案例列表 --- */
  async function loadCases() {
    // 通过 CMS 配置的 folder 结构，我们需要列出 content/cases/ 下的文件
    // 由于没有服务端 API，采用静态清单方式
    const slugs = await fetchJSON("content/cases/_index.json").catch(() => null);
    if (slugs) {
      const cases = await Promise.all(slugs.map(s => fetchJSON("content/cases/" + s + ".json")));
      return cases.sort((a, b) => (a.order || 99) - (b.order || 99));
    }
    // 降级：尝试已知文件名
    const known = ["xianyu", "ppt-design", "baitan-live"];
    const cases = await Promise.all(
      known.map(s => fetchJSON("content/cases/" + s + ".json").catch(() => null))
    );
    return cases.filter(Boolean).sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  /* --- 加载所有资料列表 --- */
  async function loadResources() {
    const known = [
      "resume-templates", "resume-guide", "interview-100", "star-template",
      "excel-roadmap", "design-crash", "freelance-tools", "media-sop",
      "teacher-exam", "pmp-pack"
    ];
    const resources = await Promise.all(
      known.map(s => fetchJSON("content/resources/" + s + ".json").catch(() => null))
    );
    return resources.filter(Boolean).sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  /* --- 加载英雄区设置 --- */
  async function loadHero() {
    return fetchJSON("content/settings/hero.json");
  }

  /* --- 渲染案例卡片 --- */
  function renderCaseCard(c, linkToDetail, basePath) {
    basePath = basePath || ''; {
    const tagMap = {
      "副业搞钱": "副业搞钱",
      "技能变现": "技能变现",
      "线上项目": "线上项目",
    };
    const tag = tagMap[c.category] || c.category;
    const href = linkToDetail ? (basePath + 'detail.html?case=') + encodeURIComponent(c.title)
      : "#";
    return `
      <a href="${href}" class="card case-card" data-category="${c.category}">
        <span class="case-tag">${tag}</span>
        <h3>${escapeHTML(c.title)}</h3>
        <p>${escapeHTML(c.summary)}</p>
      </a>`;
  }

  /* --- 渲染资料卡片 --- */
  function renderResourceCard(r) {
    return `
      <div class="card resource-card" data-category="${r.category}">
        <span class="category-label">${escapeHTML(r.category)}</span>
        <h3>${escapeHTML(r.title)}</h3>
        <p>${escapeHTML(r.description)}</p>
        <a href="${escapeHTML(r.link)}" class="btn btn-ghost">下载资料</a>
      </div>`;
  }

  /* --- HTML 转义 --- */
  function escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* --- 初始化首页 --- */
  async function initHome() {
    try {
      const hero = await loadHero();
      // 渲染英雄区
      const titleEl = document.getElementById("hero-title");
      const subtitleEl = document.getElementById("hero-subtitle");
      if (titleEl) titleEl.innerHTML = escapeHTML(hero.line1) + "<br>" + escapeHTML(hero.line2);
      if (subtitleEl) subtitleEl.textContent = hero.subtitle;

      // 渲染随机语句
      if (hero.quotes && hero.quotes.length > 0) {
        const echoEl = document.getElementById("echo-text");
        if (echoEl) {
          const idx = Math.floor(Math.random() * hero.quotes.length);
          echoEl.textContent = hero.quotes[idx].text;
        }
      }

      // 渲染案例
      const cases = await loadCases();
      const casesContainer = document.getElementById("home-cases");
      if (casesContainer && cases.length > 0) {
        casesContainer.innerHTML = cases.slice(0, 3).map(c => renderCaseCard(c, true, 'projects/')).join("");
      }

      // 渲染资料
      const resources = await loadResources();
      const resContainer = document.getElementById("home-resources");
      if (resContainer && resources.length > 0) {
        const top3 = resources.slice(0, 3);
        resContainer.innerHTML = top3.map(r => renderResourceCard(r)).join("");
      }
    } catch (e) {
      console.warn("内容加载失败，使用默认内容", e);
    }
  }

  /* --- 初始化案例列表页 --- */
  async function initProjects() {
    try {
      const cases = await loadCases();
      const container = document.getElementById("cases-list");
      if (container && cases.length > 0) {
        container.innerHTML = cases.map(c => renderCaseCard(c, true, '')).join("");
      }
    } catch (e) {
      console.warn("案例加载失败", e);
    }
  }

  /* --- 初始化资料库页 --- */
  async function initResources() {
    try {
      const resources = await loadResources();
      const container = document.getElementById("resources-list");
      if (container && resources.length > 0) {
        container.innerHTML = resources.map(r => renderResourceCard(r)).join("");
      }
    } catch (e) {
      console.warn("资料加载失败", e);
    }
  }

  /* --- 初始化案例详情页 --- */
  async function initCaseDetail() {
    try {
      const params = new URLSearchParams(window.location.search);
      const title = params.get("case");
      if (!title) return;

      const cases = await loadCases();
      const found = cases.find(c => c.title === title);
      if (!found) return;

      const container = document.getElementById("case-detail");
      if (!container) return;

      container.innerHTML = `
        <a href="index.html" class="back-link">&larr; 返回案例列表</a>
        <h1>${escapeHTML(found.title)}</h1>
        <p class="article-meta">分类：${escapeHTML(found.category)}</p>
        <div class="article-body">
          ${markdownToHTML(found.body)}
        </div>`;
    } catch (e) {
      console.warn("案例详情加载失败", e);
    }
  }

  /* --- 简易 Markdown 转 HTML --- */
  function markdownToHTML(md) {
    if (!md) return "";
    return md
      .split(/\n\n+/)
      .map(block => {
        block = block.trim();
        if (!block) return "";
        return "<p>" + escapeHTML(block).replace(/\n/g, "<br>") + "</p>";
      })
      .join("");
  }

  /* --- 公开 API --- */
  return {
    initHome,
    initProjects,
    initResources,
    initCaseDetail,
    renderCaseCard,
    renderResourceCard,
  };
})();
