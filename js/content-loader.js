/* ============================================================
   破薪阁 — 内容加载引擎
   优先读取内嵌 EMBEDDED_DATA，降级使用 fetch()
   支持图片渲染、点赞、评论
   ============================================================ */

const ContentLoader = (() => {
  const BASE = (function() {
    var p = window.location.pathname;
    if (/\/projects\/|\/resources\/|\/books\/|\/forum\//.test(p)) return "../";
    return "";
  })();

  function getEmbedded(key) {
    try {
      if (typeof EMBEDDED_DATA !== "undefined" && EMBEDDED_DATA) {
        return EMBEDDED_DATA[key];
      }
    } catch (e) {}
    return null;
  }

  async function fetchJSON(path) {
    const key = "pxg_" + path;
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    const res = await fetch(BASE + path);
    if (!res.ok) throw new Error("load fail: " + path);
    const data = await res.json();
    sessionStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  async function loadCases() {
    var emb = getEmbedded("cases");
    if (emb && emb.length > 0) return emb;
    const slugs = await fetchJSON("content/cases/_index.json").catch(() => null);
    if (slugs) {
      const cases = await Promise.all(slugs.map(s => fetchJSON("content/cases/" + s + ".json")));
      return cases.sort((a, b) => (a.order || 99) - (b.order || 99));
    }
    return [];
  }

  async function loadResources() {
    var emb = getEmbedded("resources");
    if (emb && emb.length > 0) return emb;
    const known = ["resume-templates","resume-guide","interview-100","star-template","excel-roadmap","design-crash","freelance-tools","media-sop","teacher-exam","pmp-pack"];
    const resources = await Promise.all(known.map(s => fetchJSON("content/resources/" + s + ".json").catch(() => null)));
    return resources.filter(Boolean).sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  async function loadHero() {
    var emb = getEmbedded("hero");
    if (emb) return emb;
    return fetchJSON("content/settings/hero.json");
  }

  function renderCaseCard(c, linkToDetail, basePath) {
    basePath = basePath || "";
    const href = linkToDetail ? (basePath + "detail.html?case=" + encodeURIComponent(c.title)) : "#";
    return '<a href="' + href + '" class="card case-card" data-category="' + escapeHTML(c.category) + '">'
      + '<span class="case-tag">' + escapeHTML(c.category) + '</span>'
      + '<h3>' + escapeHTML(c.title) + '</h3>'
      + '<p>' + escapeHTML(c.summary) + '</p></a>';
  }

  function renderResourceCard(r) {
    var link = (r.link || "").trim();
    var isExternal = link.startsWith("http");
    var isPlaceholder = !link || link === "#";
    var btnHTML = "";
    if (isPlaceholder) {
      btnHTML = '<span class="btn btn-ghost btn-disabled">coming soon</span>';
    } else if (isExternal) {
      btnHTML = '<a href="' + escapeHTML(link) + '" class="btn btn-ghost" target="_blank" rel="noopener noreferrer">download</a>';
    } else {
      var ext = link.split(".").pop().toUpperCase();
      btnHTML = '<a href="' + escapeHTML(link) + '" class="btn btn-ghost" download>download <small>(' + ext + ')</small></a>';
    }
    return '<div class="card resource-card" data-category="' + escapeHTML(r.category) + '">'
      + '<span class="category-label">' + escapeHTML(r.category) + '</span>'
      + '<h3>' + escapeHTML(r.title) + '</h3>'
      + '<p>' + escapeHTML(r.description) + '</p>' + btnHTML + '</div>';
  }

  function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  /* --- 渲染案例正文：处理图片标记 + Markdown 链接 --- */
  function renderCaseBody(body, images, linkPrefix) {
    if (!body) return "";
    linkPrefix = linkPrefix || "";
    images = images || [];

    // Step 1: replace %%IMG_N%% with <img> tags
    var withImgs = body.replace(/%%IMG_(\d+)%%/g, function(match, idx) {
      var i = parseInt(idx);
      if (i < images.length && images[i]) {
        var src = images[i].src || images[i];
        if (linkPrefix && !/^(https?:|\/|#)/.test(src)) {
          src = linkPrefix + src;
        }
        return '<figure class="case-figure"><img src="' + src + '" alt="" loading="lazy"></figure>';
      }
      return "";
    });

    // Step 2: convert [text](url) to placeholders
    var links = [];
    var processed = withImgs.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, text, url) {
      var fullUrl = url;
      if (linkPrefix && !/^(https?:|\/|#)/.test(url)) fullUrl = linkPrefix + url;
      var idx = links.length;
      links.push('<a href="' + fullUrl + '" class="body-link">' + escapeHTML(text) + '</a>');
      return "%%LINK_" + idx + "%%";
    });

    // Step 3: split into paragraphs
    var html = processed.split(/\n\n+/).map(function(block) {
      block = block.trim();
      if (!block) return "";
      if (block.indexOf("<figure") !== -1) return block;
      return "<p>" + escapeHTML(block).replace(/\n/g, "<br>") + "</p>";
    }).join("");

    // Step 4: restore links
    html = html.replace(/%%LINK_(\d+)%%/g, function(match, idx) {
      return links[parseInt(idx)] || "";
    });

    // Clean up empty <p></p>
    html = html.replace(/<p>\s*<\/p>/g, "");
    html = html.replace(/<p><\/p><figure/g, "<figure");
    html = html.replace(/<\/figure><p><\/p>/g, "</figure>");

    return html;
  }

  /* --- 点赞功能 --- */
  function getLikeKey(title) { return "pxg_like_" + encodeURIComponent(title); }
  function getLikeCount(title) {
    try { return parseInt(localStorage.getItem(getLikeKey(title))) || 0; } catch(e) { return 0; }
  }
  function setLikeCount(title, count) {
    try { localStorage.setItem(getLikeKey(title), count); } catch(e) {}
  }
  function renderLikeButton(title) {
    var count = getLikeCount(title);
    var liked = count > 0;
    return '<div class="like-section">'
      + '<button class="like-btn' + (liked ? ' liked' : '') + '" onclick="ContentLoader.toggleLike(this, \'' + escapeHTML(title).replace(/'/g, "\\'") + '\')">'
      + '<svg width="20" height="20" viewBox="0 0 24 24" fill="' + (liked ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>'
      + '<span class="like-count">' + count + '</span>'
      + '</button></div>';
  }
  function toggleLike(btn, title) {
    var count = getLikeCount(title);
    if (count > 0) {
      count = 0;
      btn.classList.remove("liked");
      btn.querySelector("svg").setAttribute("fill", "none");
    } else {
      count = 1;
      btn.classList.add("liked");
      btn.querySelector("svg").setAttribute("fill", "currentColor");
    }
    setLikeCount(title, count);
    btn.querySelector(".like-count").textContent = count;
  }

  /* --- 评论功能 --- */
  function getCommentKey(title) { return "pxg_cmt_" + encodeURIComponent(title); }
  function getComments(title) {
    try { return JSON.parse(localStorage.getItem(getCommentKey(title))) || []; } catch(e) { return []; }
  }
  function saveComments(title, comments) {
    try { localStorage.setItem(getCommentKey(title), JSON.stringify(comments)); } catch(e) {}
  }
  function renderCommentSection(title) {
    var comments = getComments(title);
    var html = '<div class="comment-section"><h3>评论 (' + comments.length + ')</h3>';
    html += '<div class="comment-form">'
      + '<textarea id="comment-input" placeholder="写下你的想法..." rows="3"></textarea>'
      + '<button class="btn btn-primary btn-small" onclick="ContentLoader.submitComment(\'' + escapeHTML(title).replace(/'/g, "\\'") + '\')">发表评论</button>'
      + '</div>';
    html += '<div class="comment-list" id="comment-list">';
    if (comments.length === 0) {
      html += '<p class="comment-empty">暂无评论，来说两句吧</p>';
    } else {
      for (var i = comments.length - 1; i >= 0; i--) {
        var c = comments[i];
        html += '<div class="comment-item"><div class="comment-header"><span class="comment-author">' + escapeHTML(c.author || "匿名") + '</span><span class="comment-time">' + escapeHTML(c.time || "") + '</span></div><p class="comment-body">' + escapeHTML(c.text) + '</p></div>';
      }
    }
    html += '</div></div>';
    return html;
  }
  function submitComment(title) {
    var input = document.getElementById("comment-input");
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    var comments = getComments(title);
    var now = new Date();
    var timeStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0") + " " + String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");
    comments.push({ author: "匿名", time: timeStr, text: text });
    saveComments(title, comments);
    input.value = "";
    document.getElementById("comment-list").innerHTML = renderCommentList(comments);
    updateCommentCount(title, comments.length);
  }
  function renderCommentList(comments) {
    if (comments.length === 0) return '<p class="comment-empty">暂无评论，来说两句吧</p>';
    var html = "";
    for (var i = comments.length - 1; i >= 0; i--) {
      var c = comments[i];
      html += '<div class="comment-item"><div class="comment-header"><span class="comment-author">' + escapeHTML(c.author || "匿名") + '</span><span class="comment-time">' + escapeHTML(c.time || "") + '</span></div><p class="comment-body">' + escapeHTML(c.text) + '</p></div>';
    }
    return html;
  }
  function updateCommentCount(title, count) {
    var h3 = document.querySelector(".comment-section h3");
    if (h3) h3.textContent = "评论 (" + count + ")";
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
        if (echoEl) echoEl.textContent = hero.quotes[Math.floor(Math.random() * hero.quotes.length)].text;
      }
      var cases = await loadCases();
      var cc = document.getElementById("home-cases");
      if (cc && cases.length > 0) cc.innerHTML = cases.slice(0, 3).map(function(c) { return renderCaseCard(c, true, "projects/"); }).join("");
      var resources = await loadResources();
      var rc = document.getElementById("home-resources");
      if (rc && resources.length > 0) rc.innerHTML = resources.slice(0, 3).map(renderResourceCard).join("");
    } catch (e) { console.warn("home load fail", e); }
  }

  async function initProjects() {
    try {
      var cases = await loadCases();
      var c = document.getElementById("cases-list");
      if (c && cases.length > 0) c.innerHTML = cases.map(function(x) { return renderCaseCard(x, true, ""); }).join("");
    } catch (e) { console.warn("projects load fail", e); }
  }

  async function initResources() {
    try {
      var resources = await loadResources();
      var c = document.getElementById("resources-list");
      if (c && resources.length > 0) c.innerHTML = resources.map(renderResourceCard).join("");
    } catch (e) { console.warn("resources load fail", e); }
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

      container.innerHTML = '<a href="index.html" class="back-link">&larr; return</a>'
        + '<h1>' + escapeHTML(found.title) + '</h1>'
        + '<p class="article-meta">cat: ' + escapeHTML(found.category) + '</p>'
        + '<div class="article-body">' + renderCaseBody(found.body, found.images, "../") + '</div>'
        + renderLikeButton(found.title)
        + renderCommentSection(found.title);
    } catch (e) { console.warn("detail load fail", e); }
  }

  return {
    initHome: initHome, initProjects: initProjects, initResources: initResources,
    initCaseDetail: initCaseDetail, toggleLike: toggleLike, submitComment: submitComment
  };
})();
