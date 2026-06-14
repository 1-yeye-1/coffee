# Coffee Book 部署说明

Coffee Book 是一个前后端分离的咖啡与阅读空间全栈项目。当前架构已完成 Phase 10-1/10-2 整理，分为前台主站、后台管理和后端 API 三端。

## 目录结构

```text
coffee-book/
├── apps/
│   ├── web/              前台主站 Vue/Vite 项目
│   └── admin/            后台管理 Vue/Vite 项目
├── server/               Node.js API、路由、服务、MySQL 脚本
├── scripts/              smoke test 与辅助脚本
├── package.json          根目录统一脚本
├── package-lock.json
├── .env.example          后端环境变量示例
└── DELIVERY.md           最终交付说明
```

## 技术栈

- 前端：Vue 3、Vue Router、Pinia、Vite
- 后端：Node.js HTTP Server、自定义轻量路由
- 数据库：MySQL 8、`mysql2`
- 鉴权：JWT，密钥来自环境变量 `JWT_SECRET`
- 样式：项目内 Design System CSS tokens 与基础组件

## 本地启动

先复制根目录 `.env.example` 为 `.env`，并配置本地 MySQL 账号、密码和 JWT 密钥。不要提交 `.env`。

```bash
npm install
npm run db:init
npm run db:seed
npm run dev:server
npm run dev:web
npm run dev:admin
```

也可以同时启动三端：

```bash
npm run dev:all
```

默认端口：

```text
后端 API: http://127.0.0.1:4173/api
前台 web: http://127.0.0.1:5173
后台 admin: http://127.0.0.1:5174
```

## 构建命令

```bash
npm run build:web
npm run build:admin
npm run build
```

构建产物：

```text
dist/web      前台静态资源
dist/admin    后台静态资源
```

`dist/` 不提交到 Git，部署时由构建流程生成。

## 前台 web 部署

- 项目目录：`apps/web`
- 构建命令：`npm run build:web`
- 构建产物：`dist/web`
- 推荐部署：Nginx、Vercel、Netlify 或任意静态服务器
- 生产环境变量：`VITE_API_BASE_URL=https://your-api-domain.com/api`

生产构建前，将 `apps/web/.env.example` 中的 API 地址替换为真实后端 API 域名。

## 后台 admin 部署

- 项目目录：`apps/admin`
- 构建命令：`npm run build:admin`
- 构建产物：`dist/admin`
- 推荐部署：Nginx 或静态服务器
- 生产环境变量：`VITE_API_BASE_URL=https://your-api-domain.com/api`
- 建议使用独立域名或子域名，例如 `https://admin.example.com`

后台只包含管理路由，不显示前台 Header/Footer。后台页面需要 admin 权限。

## 后端 server 部署

- 项目目录：`server`
- 启动命令：`npm run start`
- 运行端口：由 `SERVER_PORT` 控制，默认 `4173`
- 必需依赖：Node.js、MySQL
- 必需配置：根目录 `.env`
- 推荐部署：Node 服务器；PM2 可用于进程守护；Docker 可作为后续增强
- 生产环境建议通过 Nginx 反向代理 `/api` 到 Node 服务

## MySQL 部署

- 数据库名：`coffee`
- 字符集：`utf8mb4`
- 初始化命令：`npm run db:init`
- 种子命令：`npm run db:seed`
- 生产环境不要使用弱密码
- 生产环境应定期备份数据库

## 生产环境变量

根目录 `.env.example` 用于后端：

```text
NODE_ENV=production
SERVER_PORT=4173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=coffee
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=https://your-web-domain.com,https://your-admin-domain.com
SMOKE_ADMIN_USERNAME=admin
SMOKE_ADMIN_PASSWORD=admin123456
```

前台与后台都需要在构建时配置：

```text
VITE_API_BASE_URL=https://your-api-domain.com/api
```

注意：

- 不要提交真实数据库密码
- 不要提交真实 `JWT_SECRET`
- `DB_NAME` 必须保持为 `coffee`
- `CORS_ORIGIN` 需要同时包含前台和后台真实来源

## Nginx 示例

以下示例仅说明部署方式，不包含真实域名、IP 或密码。

```nginx
server {
  listen 80;
  server_name your-web-domain.com;

  root /var/www/coffee-book/web;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}

server {
  listen 80;
  server_name your-admin-domain.com;

  root /var/www/coffee-book/admin;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}

server {
  listen 80;
  server_name your-api-domain.com;

  location /api/ {
    proxy_pass http://127.0.0.1:4173/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

说明：

- `dist/web` 指向前台静态资源目录
- `dist/admin` 指向后台静态资源目录
- `/api` 反向代理到 Node 后端服务
- Vue history 路由必须 fallback 到 `index.html`
- 前台和后台建议使用不同域名或子域名

## PM2 建议

PM2 不是项目必需依赖，只作为生产进程守护建议。

```bash
npm install -g pm2
pm2 start npm --name coffee-book-api -- run start
pm2 logs coffee-book-api
pm2 status
pm2 save
pm2 startup
```

部署前确认服务器已经配置 `.env`、MySQL 可连接，并完成 `npm run db:init`。

## Smoke Test

启动后端后执行：

```bash
npm run smoke:api
```

Smoke Test 覆盖健康检查、管理员登录、`/auth/me`、前台列表、后台权限、普通用户 403、购物车、订单、活动、社区和预约空间接口。

## 默认管理员账号

```text
username: admin
password: admin123456
```

生产环境请不要长期使用默认弱口令。

## 安全说明

- `.env` 不提交到 Git
- `node_modules/` 不提交到 Git
- `dist/` 不提交到 Git
- JWT 密钥从 `JWT_SECRET` 读取
- CORS 通过 `CORS_ORIGIN` 配置
- 后台 API 使用 `requireAdmin`
- 普通用户订单按 `user_id` 隔离
- SQL 写入与查询使用参数化执行
- 后台写操作保留 `audit_logs`

## 未接入能力

项目暂未接入真实支付、文件上传、短信、邮件、WebSocket 实时通知、第三方推荐算法等外部服务。当前支付流程为演示用状态流转。
