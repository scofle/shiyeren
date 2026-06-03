# 破薪阁 — 项目复用知识库

## 一、项目架构

```
shiyeren/
├── index.html                 # 首页：英雄区 + 最新案例 + 热门资料
├── 404.html                   # 404 页面
├── css/style.css              # 全局样式
├── js/
│   ├── data.js                # 【自动生成】内嵌全部数据，file:// 或离线可加载
│   ├── content-loader.js      # 内容加载引擎：优先 EMBEDDED_DATA，降级 fetch()
│   └── main.js                # 汉堡菜单 + 分类筛选 + 资料标签切换
├── content/
│   ├── cases/                 # 案例 JSON（每篇一个文件）
│   │   ├── _index.json        # 案例索引：决定加载哪些 + 加载顺序
│   │   └── case-XX.json       # 单个案例：title/summary/category/order/body/images
│   ├── resources/             # 资料 JSON（每项一个文件）
│   └── settings/hero.json     # 首页英雄区配置
├── projects/
│   ├── index.html             # 案例列表页
│   └── detail.html            # 案例详情页（图片 + 点赞 + 评论）
├── resources/
│   └── index.html             # 资料库列表页
├── assets/
│   ├── case-images/           # 【自动提取】每案例一个子目录的图片
│   └── files/                 # 源文件（.docx），不上传 OSS
├── .github/workflows/deploy.yml  # GitHub Actions → OSS 自动部署
└── .gitignore                 # 排除 assets/files/ 不上传
```

---

## 二、核心模式

### 2.1 数据驱动静态网站

**核心思路**：内容存储在 JSON 文件中，JS 动态加载渲染。

**案例 JSON 格式**（`content/cases/case-XX.json`）：
```json
{
  "title": "第1招：豆包5分钟精修简历",
  "summary": "一句话描述",
  "category": "技能变现",
  "order": 1,
  "body": "正文段落...\n\n%%IMG_0%%\n\n继续正文...",
  "images": [
    { "index": 0, "src": "assets/case-images/case-01/img0.png" }
  ]
}
```

**资料 JSON 格式**（`content/resources/xxx.json`）：
```json
{
  "title": "资料名称",
  "category": "简历模板",
  "description": "简介",
  "link": "https://docs.qq.com/sheet/xxx",
  "order": 1
}
```

**关键设计**：
- `_index.json` 数组决定加载哪些 JSON 文件及顺序
- `order` 字段控制排序
- 图片用 `%%IMG_N%%` 占位符，正文存纯文本，渲染时替换为 `<img>` 标签

### 2.2 内嵌数据 + 降级 fetch 模式

**问题**：`file://` 协议下 `fetch()` 被浏览器 CORS 阻止。

**解决方案**（`content-loader.js`）：
```javascript
// 优先读取内嵌数据（file:// 可用）
function getEmbedded(key) {
  try { return EMBEDDED_DATA[key]; } catch(e) {}
  return null;
}

// 降级使用 fetch（HTTP 服务器可用）
async function loadCases() {
  var emb = getEmbedded("cases");
  if (emb && emb.length > 0) return emb;
  // ... fetch() 降级逻辑
}
```

**data.js 生成**：用 Python 脚本读取所有 JSON 文件，合并成一个 `EMBEDDED_DATA` 对象。

**所有用到 ContentLoader 的 HTML 页面必须**在 `content-loader.js` **之前**引入 `data.js`：
```html
<script src="js/data.js"></script>          <!-- 必须先加载 -->
<script src="js/content-loader.js"></script>
```

### 2.3 图片提取与渲染

**从 DOCX 提取图片**：
```python
# 1. 用 zipfile 打开 .docx
# 2. 解析 word/_rels/document.xml.rels 获取 rId → image 映射
# 3. 解析 word/document.xml 获取段落文本 + drawing 位置
# 4. 将 word/media/ 中的图片提取到 assets/case-images/{slug}/
# 5. 重建 body 文本，在图片位置插入 %%IMG_N%% 占位符
# 6. 生成 images 数组：[{ "index": N, "src": "路径" }]
```

**前端渲染**（`content-loader.js`）：
```javascript
function renderCaseBody(body, images, linkPrefix) {
  // Step 1: %%IMG_N%% → <figure><img src="..."></figure>
  // Step 2: [文本](链接) → <a href="...">
  // Step 3: 按双换行分段 → <p>...</p>
  // 图片块跳过 HTML 转义，直接保留
}
```

### 2.4 点赞 + 评论（纯前端，无需后端）

```javascript
// 点赞：localStorage 存计数
function toggleLike(btn, title) {
  var key = "pxg_like_" + encodeURIComponent(title);
  var count = parseInt(localStorage.getItem(key)) || 0;
  // 已赞则取消，未赞则 +1
}

// 评论：localStorage 存 JSON 数组
function submitComment(title) {
  var key = "pxg_cmt_" + encodeURIComponent(title);
  var comments = JSON.parse(localStorage.getItem(key)) || [];
  comments.push({ author: "匿名", time: "2026-06-03 14:30", text: "..." });
  localStorage.setItem(key, JSON.stringify(comments));
}
```

### 2.5 GitHub Actions → 阿里云 OSS 自动部署

**完整 deploy.yml**：
```yaml
name: 部署到阿里云 OSS
on:
  push:
    branches: [ "main" ]
  workflow_dispatch:  # 支持手动触发

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 同步文件到 OSS
        env:
          OSS_KEY: ${{ secrets.ALIBABA_CLOUD_ACCESS_KEY_ID }}
          OSS_SECRET: ${{ secrets.ALIBABA_CLOUD_ACCESS_KEY_SECRET }}
        run: |
          pip install oss2 -q
          python3 << 'PYEOF'
          import os, oss2
          auth = oss2.Auth(os.environ["OSS_KEY"], os.environ["OSS_SECRET"])
          bucket = oss2.Bucket(auth, "oss-cn-hongkong.aliyuncs.com", "shiveren-hk")
          # 遍历本地文件，上传，删除 OSS 上多余文件
          PYEOF
```

**部署方式**：`git push origin main` → GitHub Actions 自动运行 → oss2 SDK 同步到 OSS。

---

## 三、操作流程

### 新增案例
1. 在 `assets/files/` 放好 `.docx` 文件
2. 运行图片提取脚本 → 生成 `assets/case-images/case-XX/`
3. 在 `content/cases/` 创建对应 JSON
4. 在 `_index.json` 添加文件名
5. 运行 `data.js` 生成脚本
6. `git commit && git push`

### 新增资料
1. 在 `content/resources/` 创建 JSON 文件
2. 在 `content-loader.js` 的 `known` 数组中添加文件名
3. 运行 `data.js` 生成脚本
4. `git commit && git push`

### data.js 生成命令
```python
# 读取所有 JSON → 生成 js/data.js
python gen_data.py
```

---

## 四、常见问题与解决方案

| 问题 | 原因 | 解决 |
|------|------|------|
| file:// 打开看不到内容 | fetch() 被 CORS 阻止 | 引入内嵌 data.js 模式 |
| 图片显示为 HTML 源码 | HTML 片段被 escapeHTML 转义 | 图片块用 `indexOf("<figure") !== -1` 跳过转义 |
| DOXC 提取中文乱码 | UTF-8 BOM | 用 `utf-8-sig` 编码读取 |
| PowerShell heredoc 中文损坏 | PowerShell 编码问题 | 写 `.py` 文件再用 Python 执行 |
| OSS 部署 AccessKey 报错 | Secret 值有多余空格/换行 | 手动重新粘贴 AccessKey ID 和 Secret |
| ossutil 下载一直 404 | 阿里 CDN 被 GitHub Actions 屏蔽 | 改用 Python oss2 SDK |
| GitHub Actions 第三方 Action 找不到版本 | Action 仓库没有对应 tag | 避免依赖第三方 Action，用原生脚本 |
| 网站更新后公网没变化 | CDN 缓存或绑定了自定义域名 | 刷新 CDN 缓存，确认访问的是 OSS 直链 |

---

## 五、技术选型总结

| 需求 | 推荐方案 |
|------|----------|
| 静态网站架构 | HTML + JS + JSON 数据驱动 |
| 离线/file:// 可用 | 内嵌 EMBEDDED_DATA |
| 图片管理 | DOCX 提取 → 独立目录 → %%IMG_N%% 占位符 |
| 交互功能（点赞/评论） | localStorage，无需后端 |
| CI/CD 部署 | GitHub Actions + Python oss2 SDK |
| 内容托管 | 阿里云 OSS 静态网站托管 |
| 资料外链 | 腾讯文档共享链接 |
| 样式框架 | 原生 CSS + Lucide 图标（如需） |
