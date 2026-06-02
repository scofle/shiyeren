# 破薪阁 — 阿里云 OSS 自动部署指南

## 架构概览

```
你在网页后台改内容
        ↓
Decap CMS 自动提交到 GitHub
        ↓
GitHub Actions 自动同步到阿里云 OSS
        ↓
网站更新完成（全自动，无需手动上传）
```

## 一、你需要准备的 3 个信息

| 信息 | 在哪里找 | 示例 |
|------|---------|------|
| OSS 地域节点 | 阿里云 OSS 控制台 → Bucket 概览 → 外网访问 | `oss-cn-hangzhou.aliyuncs.com` |
| Bucket 名称 | 同上 | `my-bucket` |
| AccessKey | 阿里云 RAM 访问控制 → 用户 → 创建 AccessKey | `LTAI5t...` |

## 二、配置步骤（4 步）

### 1. 阿里云：创建 AccessKey
- 登录 [RAM 访问控制](https://ram.console.aliyun.com/users)
- 创建用户 → 勾选"OpenAPI 调用访问"
- 权限策略选 `AliyunOSSFullAccess`
- 保存 AccessKey ID + Secret

### 2. GitHub：添加 Secrets
- 打开仓库 → Settings → Secrets and variables → Actions
- 添加两个 Repository secrets：

| Name | Value |
|------|-------|
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | 你的 AccessKey ID |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | 你的 AccessKey Secret |

### 3. 修改部署脚本
- 打开 `.github/workflows/deploy.yml`
- 把 `oss-cn-REGION.aliyuncs.com` 换成你的地域节点
- 把 `YOUR-BUCKET-NAME` 换成你的 Bucket 名称
- 提交这个修改

### 4. 修改 CMS 域名
- 打开 `admin/config.yml`
- 把 `YOUR_DOMAIN` 换成你的 OSS 域名（如 `my-bucket.oss-cn-hangzhou.aliyuncs.com`）
- 提交这个修改

## 三、OSS Bucket 设置

- 读写权限：**公共读**
- 静态页面默认首页：`index.html`
- 静态页面默认 404：`404.html`
- 如果绑定自定义域名，在 CDN 中配置 HTTPS 证书

## 四、验证

1. 推送代码后，GitHub 的 Actions 标签页会自动运行部署
2. 部署成功后访问 OSS 域名确认网站正常
3. 访问 `/admin/` 用 GitHub 账号登录后台

## 五、成本估算

| 项目 | 月费 |
|------|------|
| OSS 存储 | ~0.12 元 |
| OSS 流量（<5GB） | ~2.5 元 |
| GitHub Actions | 免费（公开仓库无限） |
| **合计** | **<5 元/月** |
