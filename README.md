# 虚拟资料商城 🛍️

会员制虚拟资料下载网站。开通会员（￥10）即可免费下载所有资料，邀请 3 位好友充值可返还会员费。

## 技术栈

- **后端**: Node.js + Express
- **前端**: Bootstrap 5 + EJS 模板
- **数据**: JSON 文件存储

## 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm start

# 3. 打开浏览器访问
# http://localhost:3000
```

**默认管理员账号**: `admin` / `admin123`

## 部署到 Zeabur

### 第一步：上传到 GitHub

1. 打开 [github.com](https://github.com) 注册/登录
2. 点击右上角 "+" → "New repository"
3. 仓库名填 `digital-market`，选择 **Private**（私有）
4. 创建后，按页面提示上传代码：

```bash
# 在项目目录打开终端，运行：
git init
git add .
git commit -m "首次提交"
git branch -M main
git remote add origin https://github.com/你的用户名/digital-market.git
git push -u origin main
```

### 第二步：在 Zeabur 部署

1. 打开 [zeabur.com](https://zeabur.com) 并用 GitHub 登录
2. 点击 "New Project" → "Deploy from GitHub"
3. 选择刚创建的 `digital-market` 仓库
4. Zeabur 会自动检测 Node.js 项目并开始部署

### 第三步：配置持久化存储（重要！）

为了让数据不丢失，需要配置持久化存储：

1. 在 Zeabur 项目页面，点击左侧 "Storage"
2. 添加一个 Volume，挂载到 `/data`
3. 在 "Environment" 中添加环境变量：
   - `DATA_DIR` = `/data`
   - `SESSION_SECRET` = 设置一个随机字符串（安全用途）

### 第四步：访问网站

部署完成后，Zeabur 会生成一个 `项目名.zeabur.app` 的域名，直接访问即可。

## 功能说明

### 管理员功能
- 登录 `admin / admin123` 进入管理后台
- 管理商品（增删改查）、分类、订单、用户
- 查看数据统计图表
- 自动生成运营周报和建议

### 会员功能
- 注册账号 → 开通会员（￥10）
- 所有资料免费下载
- 推广返现：邀请 3 人充值后退还 ￥10

### 资料管理
- 管理员上传资料时填写**网盘下载链接**
- 网站不存储任何文件，只提供跳转链接
