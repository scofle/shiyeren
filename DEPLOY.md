# 破薪阁 — OSS 静态托管部署清单

## 一、部署前代码检查

- [x] 所有资源路径已改为相对路径（CSS/JS/页面间跳转均使用 `./` 或 `../`）
- [x] 首页文件命名为 `index.html`
- [x] 无动态路由，无需 SPA 降级处理
- [x] 无后端依赖（无 API 调用、无表单提交到服务端）
- [x] 外部链接（腾讯文档、百度贴吧）保持不变，均为新标签页打开

## 二、阿里云 OSS 配置

### 1. 创建 Bucket
- 区域：选择离用户最近的（如杭州）
- 读写权限：**公共读**
- 版本控制：不需要（可选）

### 2. 开启静态网站托管
- OSS 控制台 → Bucket → 基础设置 → 静态页面
- 默认首页：`index.html`
- 默认 404 页：`404.html`

### 3. 绑定自定义域名（可选但推荐）
- OSS 控制台 → Bucket → 域名管理 → 绑定域名
- 如果启用 HTTPS，需在 CDN/全站加速中配置 SSL 证书
- DNS 添加 CNAME 记录指向 OSS 域名

### 4. 上传文件
- 将整个 `shiyeren/` 目录内容上传到 Bucket 根目录
- 确保上传时保留目录结构（css/、js/、content/ 等）

## 三、CMS 后台配置

使用 Decap CMS 需要完成以下配置：

1. 在 GitHub 创建 OAuth App（如已创建则跳过）
   - Settings → Developer settings → OAuth Apps
   - Homepage URL：你的 OSS 域名
   - Callback URL：`https://api.decapcms.org/auth/github/callback`

2. 修改 `admin/config.yml`
   - 将 `YOUR_DOMAIN` 替换为你的实际域名
   - 如果使用 OSS 默认域名，填完整地址

3. 访问后台：`你的域名/admin/`

## 四、成本估算（阿里云 OSS）

| 项目 | 预估月费 |
|------|---------|
| OSS 存储（<1GB） | ~0.12 元 |
| OSS 外网流量（<5GB/月） | ~2.5 元 |
| 自定义域名 + HTTPS | 免费（使用 CDN 加速） |
| **合计** | **<5 元/月** |

## 五、文件结构

```
Bucket 根目录/
├── index.html          # 首页（必须）
├── 404.html            # 错误页
├── admin/              # CMS 后台
├── books/              # 网络书库
├── projects/           # 搞钱案例
├── resources/          # 资料库
├── forum/              # 论坛入口
├── content/            # JSON 数据（CMS 读写）
├── css/                # 样式
├── js/                 # 脚本
└── assets/             # 上传的图片等资源
```
