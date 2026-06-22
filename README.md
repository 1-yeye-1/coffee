# Coffee Book

Coffee Book 是一个集咖啡、阅读、社区、商城、空间预约和后台管理于一体的全栈平台。项目包含用户端 Web、后台管理端 Admin 和 Express 后端 API，适合用于咖啡书屋、复合文化空间或生活方式门店的业务演示与二次开发。

## 技术栈

- 前端：Vue 3、Vite、Pinia、Vue Router
- 后端：Node.js、Express、MySQL
- 上传：Multer、本地静态资源目录
- 鉴权：JWT、前后台权限隔离
- 其他：mysql2、统一响应格式、Smoke API 测试脚本

交互动效由 GSAP、Anime.js 与 CSS transition 分工实现。GSAP 负责页面、列表、Dashboard、预约步骤等结构动画；Anime.js 负责点赞、状态反馈等微交互。共享封装位于 `apps/shared/motion/`，统一处理 reduced-motion、实例清理和长列表上限。

## 功能模块

### 用户端

- 首页
- 咖啡 / 文创商城
- 商品详情
- 购物车
- 下单与订单详情
- 空间预约
- 社区内容浏览与发帖
- 通知中心
- 用户中心
- 头像上传
- 服务条款、隐私政策、关于我们、联系我们、帮助中心

### 后台管理端

- 仪表盘
- 商品管理
- 订单管理
- 预约管理
- 社区内容管理
- 上传文件管理
- 操作日志
- 系统通知创建接口

## 目录结构

```text
coffee-book/
├─ apps/
│  ├─ web/              用户端 Vue/Vite 项目
│  └─ admin/            后台管理 Vue/Vite 项目
├─ server/              Express API、路由、服务、数据库脚本
├─ scripts/             smoke test 与辅助脚本
├─ package.json         根目录统一脚本
├─ package-lock.json
├─ .env.example         后端环境变量示例
└─ README.md
```

## 环境准备

请先安装：

- Node.js
- MySQL
- npm

复制根目录 `.env.example` 为 `.env`，并配置本地 MySQL 账号、密码和 JWT 密钥。不要提交真实 `.env`。

关键环境变量：

```text
SERVER_PORT=4173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=coffee
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174
```

## 安装依赖

```bash
npm install
```

## 数据库初始化 / 安全迁移

运行 `npm run db:init`、`npm run dev:server` 或 `npm run smoke:api` 前，MySQL 必须已启动并监听 `.env` 中的 `DB_HOST:DB_PORT`。首次使用请执行 `npm run db:init`；已有数据库只需增量迁移时可执行 `node server/db/migrate.js`。`smoke:api` 无法连接数据库时会显示当前连接地址、`DB_NAME` 和处理建议。

```bash
npm run db:init
```

当前 `npm run db:init` 严格依次执行 `node server/db/migrate.js`、`node server/db/seed.js`、`node scripts/check-db-schema.js`。迁移基于 `server/sql/schema.sql` 创建缺失表，并通过增量逻辑补充缺失字段和索引；不会默认清空已有业务数据。`DB_NAME` 可配置为 `coffee` 或其他只含字母、数字、下划线的数据库名，建库和后续查询都会使用该配置。

可单独检查关键表、字段、索引、`expires_at` 类型和 seed 基线数据：

```bash
npm run db:check
```

如需在不执行迁移的情况下单独补充演示数据，可执行：

```bash
npm run db:seed
```

生产或正式数据环境不建议直接执行任何破坏性数据库重置。执行迁移前建议先备份数据库。

## 启动命令

分别启动三端：

```bash
npm run dev:server
npm run dev:web
npm run dev:admin
```

也可以使用：

```bash
npm run dev:all
```

默认地址：

```text
后端 API: http://127.0.0.1:4173/api
用户端 Web: http://127.0.0.1:5173
后台 Admin: http://127.0.0.1:5174
```

## 构建命令

```bash
npm run build:web
npm run build:admin
npm run build
```

构建产物：

```text
dist/web
dist/admin
```

## 测试命令

提交前建议执行：

```bash
npm run build
npm run check
npm run check:motion
npm run smoke:web
npm run smoke:api
npm run smoke
```

`check:motion` 检查散落动画调用、高频事件监听清理、定时器、RAF 和危险布局动画属性。`smoke:web` 检查前后台关键路由与懒加载 chunk；`smoke:api` 使用真实 MySQL 数据覆盖鉴权、商品、订单、社区、预约、座位、上传和后台核心接口。

开发环境可在浏览器控制台临时控制全站复杂动画：

```js
window.__coffeeMotion.status()
window.__coffeeMotion.disable()
window.__coffeeMotion.enable()
```

## 默认账号

默认管理员由 seed 脚本写入：

```text
username: admin
password: admin123456
```

测试用户可执行 `npm run db:seed` 后查看 `server/db/seed.js` 中的手机号账号；也可以直接在前台注册新用户。

## 重要功能说明

### Express 后端

后端入口为 `server/index.js`，使用 Express 提供 API 服务，包含：

- JSON 与 URL encoded 请求体解析
- CORS 配置
- `/api` 前缀
- `/uploads` 静态资源访问
- 统一 404
- 统一错误处理

### 文件上传

上传使用 Multer，本地上传文件保存在：

```text
server/public/uploads/
```

当前已支持用户头像上传、社区图片/视频上传、上传记录与后台上传文件管理。生产环境建议迁移到对象存储，并增加更严格的内容安全策略。

### 通知机制

通知数据存储在 `user_notifications`，用户端支持通知列表、未读数量、单条已读、全部已读、删除、类型筛选和导航角标。

已接入的触发场景包括注册欢迎通知、订单状态通知、预约通知、社区审核通知，以及后台创建系统通知接口。

### 操作日志

后台操作日志复用并扩展 `audit_logs`。管理员登录、商品操作、订单状态、预约状态、社区审核、通知创建、上传文件删除等关键操作会写入日志。后台提供操作日志列表、筛选、搜索、分页、详情弹窗和导出预留提示。

### 商品分类

商城只保留两个一级分类：

- 咖啡商品：能直接饮用的咖啡，例如咖啡、咖啡豆、挂耳咖啡、现磨咖啡、冷萃咖啡、拿铁、美式、卡布奇诺等
- 文创商品：不能直接饮用的周边、器具和礼盒，例如咖啡杯、杯子、帆布袋、笔记本、书签、明信片、咖啡器具、手冲壶、滤纸、磨豆机、周边礼盒、文创礼盒等

数据库字段：

```text
products.product_type
products.supports_brew_method
```

无法识别的旧商品默认迁移为文创商品，不会默认归入咖啡商品。

### 咖啡制作方式

咖啡商品支持制作方式：

- `self_grind`：自己手磨
- `barista`：咖啡师制作

用户在咖啡商品详情页选择制作方式后，购物车、结算、订单明细和后台订单详情都会保留并展示该字段。文创商品不显示制作方式。

数据库字段：

```text
cart_items.brew_method
order_items.brew_method
```

同一咖啡商品如果制作方式不同，会在购物车中拆分为不同条目。

## 本地联调建议

1. 执行 `npm run db:init`
2. 启动 `npm run dev:server`
3. 启动 `npm run dev:web`
4. 启动 `npm run dev:admin`
5. 前台注册用户并确认协议勾选、欢迎通知和通知角标
6. 在商城按咖啡商品 / 文创商品筛选
7. 对咖啡商品选择不同制作方式加入购物车
8. 结算并查看用户订单详情
9. 登录后台查看订单详情、社区内容管理、上传文件管理和操作日志

## 已知风险

- `npm audit` 中如仍存在 high severity vulnerabilities，需要后续评估依赖升级和兼容性。
- 不建议直接执行破坏性数据库重置；正式环境迁移前请备份数据库。
- 上传文件当前使用本地存储，生产环境建议改为对象存储。
- 当前支付流程为演示状态流转，不接入真实支付网关。
- 本地上传目录和数据库记录需要在生产环境设计备份、清理与访问控制策略。
