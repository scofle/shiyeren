/* ============================================================
   破薪阁 — 内容加载引擎
   从 content/*.json 动态加载数据并渲染到页面
   ============================================================ */

const ContentLoader = (() => {
  const BASE = "";

  /* --- fetch JSON 并缓存 --- */
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

  /* --- 加载案例列表 --- */
  async function loadCases() {
    const slugs = await fetchJSON("content/cases/_index.json").catch(() => null);
    if (slugs) {
      const cases = await Promise.all(slugs.map(s => fetchJSON("content/cases/" + s + ".json")));
      return cases.sort((a, b) => (a.order || 99) - (b.order || 99));
    }
    const known = ["xianyu", "ppt-design", "baitan-live"];
    const cases = await Promise.all(
      known.map(s => fetchJSON("content/cases/" + s + ".json").catch(() => null))
    );
    return cases.filter(Boolean).sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  /* --- 加载资料列表 --- */
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
    basePath = basePath || '';
    const tag = c.category;
    const href = linkToDetail
      ? (basePath + "detail.html?case=" + encodeURIComponent(c.title))
      : "#";
    return '<a href="' + href + '" class="card case-card" data-category="' + escapeHTML(c.category) + '">'
      + '<span class="case-tag">' + tag + '</span>'
      + '<h3>' + escapeHTML(c.title) + '</h3>'
      + '<p>' + escapeHTML(c.summary) + '</p>'
      + '</a>';
  }

  /* --- 渲染资料卡片 ---
     三种按钮状态：
     1. link 为空或 "#" → "即将上线"（不可点击）
     2. link 以 http 开头 → 外链，新标签页打开
     3. link 是本地路径 → 下载按钮，显示文件扩展名 + download 属性
  --- */
  function renderResourceCard(r) {
    var link = (r.link || "").trim();
    var isExternal = link.startsWith("http");
    var isPlaceholder = !link || link === "#";
    var ext = "";
    var btnHTML = "";

    if (isPlaceholder) {
      btnHTML = '<span class="btn btn-ghost btn-disabled">即将上线</span>';
    } else if (isExternal) {
      btnHTML = '<a href="' + escapeHTML(link) + '" class="btn btn-ghost" target="_blank" rel="noopener noreferrer">下载资料</a>';
    } else {
      // 本地文件：提取扩展名显示，加 download 属性
      var parts = link.split(".");
      ext = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
      var extLabel = ext ? ' <small>(' + ext + ')</small>' : "";
      btnHTML = '<a href="' + escapeHTML(link) + '" class="btn btn-ghost" download>下载资料' + extLabel + '</a>';
    }

    return '<div class="card resource-card" data-category="' + escapeHTML(r.category) + '">'
      + '<span class="category-label">' + escapeHTML(r.category) + '</span>'
      + '<h3>' + escapeHTML(r.title) + '</h3>'
      + '<p>' + escapeHTML(r.description) + '</p>'
      + btnHTML
      + '</div>';
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

  /* --- 简易 Markdown 转 HTML --- */
  function markdownToHTML(md) {
    if (!md) return "";
    return md
      .split(/\n\n+/)
      .map(function(block) {
        block = block.trim();
        if (!block) return "";
        return "<p>" + escapeHTML(block).replace(/\n/g, "<br>") + "</p>";
      })
      .join("");
  }

  /* --- 初始化首页 --- */
  async function initHome() {
    try {
      var hero = await loadHero();
      var titleEl = document.getElementById("hero-title");
      var subtitleEl = document.getElementById("hero-subtitle");
      if (titleEl) titleEl.innerHTML = escapeHTML(hero.line1) + "<br>" + escapeHTML(hero.line2);
      if (subtitleEl) subtitleEl.textContent = hero.subtitle;

      if (hero.quotes && hero.quotes.length > 0) {
        var echoEl = document.getElementById("echo-text");
        if (echoEl) {
          var idx = Math.floor(Math.random() * hero.quotes.length);
          echoEl.textContent = hero.quotes[idx].text;
        }
      }

      var cases = await loadCases();
      var casesContainer = document.getElementById("home-cases");
      if (casesContainer && cases.length > 0) {
        casesContainer.innerHTML = cases.slice(0, 3).map(function(c) {
          return renderCaseCard(c, true, "projects/");
        }).join("");
      }

      var resources = await loadResources();
      var resContainer = document.getElementById("home-resources");
      if (resContainer && resources.length > 0) {
        var top3 = resources.slice(0, 3);
        resContainer.innerHTML = top3.map(renderResourceCard).join("");
      }
    } catch (e) {
      console.warn("内容加载失败，使用默认内容", e);
    }
  }

  /* --- 初始化案例列表页 --- */
  async function initProjects() {
    try {
      var cases = await loadCases();
      var container = document.getElementById("cases-list");
      if (container && cases.length > 0) {
        container.innerHTML = cases.map(function(c) {
          return renderCaseCard(c, true, "");
        }).join("");
      }
    } catch (e) {
      console.warn("案例加载失败", e);
    }
  }

  /* --- 初始化资料库页 --- */
  async function initResources() {
    try {
      var resources = await loadResources();
      var container = document.getElementById("resources-list");
      if (container && resources.length > 0) {
        container.innerHTML = resources.map(renderResourceCard).join("");
      }
    } catch (e) {
      console.warn("资料加载失败", e);
    }
  }

  /* --- 初始化案例详情页 --- */
  async function initCaseDetail() {
    try {
      var params = new URLSearchParams(window.location.search);
      var title = params.get("case");
      if (!title) return;

      var cases = await loadCases();
      var found = cases.find(function(c) { return c.title === title; });
      if (!found) return;

      var container = document.getElementById("case-detail");
      if (!container) return;

      container.innerHTML = '<a href="index.html" class="back-link">&larr; 返回案例列表</a>'
        + '<h1>' + escapeHTML(found.title) + '</h1>'
        + '<p class="article-meta">分类：' + escapeHTML(found.category) + '</p>'
        + '<div class="article-body">' + markdownToHTML(found.body) + '</div>';
    } catch (e) {
      console.warn("案例详情加载失败", e);
    }
  }

  return {
    initHome: initHome,
    initProjects: initProjects,
    initResources: initResources,
    initCaseDetail: initCaseDetail
  };
})();
