# Coffee Book

Coffee Book 是一个面向咖啡书屋、复合文化空间和校园文化门店的全栈 Web 平台。项目包含用户端 Web、后台管理端 Admin 和 Express 后端 API，围绕“咖啡消费 + 图书阅读 + 活动报名 + 社区交流 + 空间预约 + 会员积分”形成完整业务闭环。

> 说明：本文档按当前 Release Candidate 版本整理，覆盖前台、后台、后端、数据库、演示数据、测试命令和最终交付说明。

## 1. 技术栈

### 前端
- Vue 3
- Vite
- Pinia
- Vue Router
- CSS Design System
- GSAP / Anime.js 动画
- 自定义多主题 Cursor 系统
- 统一 Loading / Empty / Error 状态
- SEO meta 管理
- 全局错误兜底

### 后端
- Node.js
- Express
- MySQL / mysql2
- JWT 鉴权
- Multer 文件上传
- 统一响应格式
- Service 分层业务逻辑
- stats.service 统一统计服务
- audit.service 审计日志服务

### 数据库
- MySQL
- 幂等迁移：`server/db/migrate.js`
- 基础种子：`server/db/seed.js`
- 演示数据：`server/db/seed-demo.js`
- 结构检查：`scripts/check-db-schema.js`

## 2. 功能模块

### 用户端 Web
- 首页：Hero 展示、精选咖啡、精选图书、社区统计、图片优先加载、骨架屏与错误兜底。
- 咖啡商城：商品列表、分类筛选、商品详情、购物车、结算、模拟支付、商品评论、评论点赞与回复。
- 图书中心：图书列表、图书详情、收藏、图书预约、位置绑定、图书评论、评论点赞与回复。
- 活动中心：活动列表、分类筛选、活动详情、活动报名、取消报名、日历模式点击查看详情。
- 社区交流：帖子列表、发帖、详情、评论、二级回复、点赞、评论点赞、举报与审核联动。
- 空间预约：统一咖啡书屋座位地图、固定时间段选择、分阶段预约流程、确认信息提交。
- 会员中心：订单、预约、活动、收藏、积分、优惠券、消息、个人资料、会员成长体系。
- 积分中心：积分余额、积分流水、优惠券兑换、生日券、每日签到、成长值展示。
- 消息中心：消息列表、跳转业务区域、批量已读、批量删除、置顶消息。
- 登录 / 注册：手机号密码登录、手机号验证码登录、图形数字验证码、密码显示/隐藏。
- 交互体验：多主题 Cursor、BackToTop 返回顶部、reduced-motion 降级、全局错误兜底。

### 后台 Admin
- 后台首页：真实数据库统计、订单/用户趋势、运营概览。
- 商品管理：商品 CRUD、图片上传、上下架、批量操作、评论数据联动。
- 图书管理：图书 CRUD、封面上传、座位/位置绑定、显示/隐藏、批量操作。
- 活动管理：活动 CRUD、活动封面、发布/下线、批量操作。
- 社区审核：帖子、评论、举报审核；通过、驳回、隐藏；批量审核；操作 UI 优化。
- 订单管理：订单列表、状态更新、批量标记处理/完成。
- 预约管理：座位预约与图书预约管理、批量确认/取消。
- 座位管理：统一 SeatMap，后台拖拽编辑座位坐标，前台刷新同步显示。
- 用户管理：用户资料、积分、成长值、会员等级、签到状态、启用/禁用、批量操作。
- 操作日志：管理员与普通用户关键操作审计，筛选、详情、多选查看数量。
- 上传管理：商品/图书/活动/头像/社区上传记录，后台上传允许 `user_id = NULL`。

## 3. 项目亮点

- 前后台完整闭环：用户端业务与后台运营管理互相联动。
- 真实数据库统计：Dashboard、社区、收藏、评论、积分、优惠券等统计均来自数据库聚合。
- 数据层统一：stats service 统一统计口径；Asia/Shanghai 业务日期统一时间规则。
- 座位地图拖拽同步：前后台共用 SeatMap，一套数据，两种模式。
- 多主题 Cursor 系统：Coffee Halo、Cream Capsule、Book Reader、Amber Trail、Minimal Dot。
- 评论点赞回复：图书、商品、社区评论支持点赞、取消点赞、二级回复。
- 会员成长体系：成长值、会员等级、每日签到、积分奖励与审计日志联动。
- 积分优惠券体系：积分兑换优惠券、生日券年度防重复发放。
- 全局错误兜底：Vue errorHandler、router.onError、window.onerror、unhandledrejection。
- UI 收敛与加载体验：Skeleton、占位图、图片 fallback、BackToTop、分类栏变体。
- 后台批量管理：主要管理页支持多选、全选、批量状态操作。
- 演示数据脚本：`npm run db:demo` 可生成真实关联演示数据，支持幂等执行。

## 4. 目录结构

```text
coffee-book/
├─ apps/
│  ├─ web/                 用户端 Vue/Vite 项目
│  ├─ admin/               后台管理 Vue/Vite 项目
│  └─ shared/              前后台共享组件、样式、动画、SEO、错误处理
├─ server/
│  ├─ routes/              Express 路由层
│  ├─ services/            业务服务层
│  ├─ middlewares/         鉴权、错误处理等中间件
│  ├─ db/                  迁移、种子、演示数据脚本
│  ├─ sql/                 schema.sql
│  ├─ utils/               上传、日期、响应、辅助工具
│  └─ public/uploads/      本地上传文件目录
├─ scripts/                检查、smoke、motion、项目审计脚本
├─ docs/                   项目文档
├─ .env.example            环境变量示例
├─ package.json            根目录统一脚本
├─ README.md
└─ DELIVERY.md
```

更详细说明见 [`docs/项目结构说明.md`](docs/项目结构说明.md)。

## 5. 环境要求

- Node.js 18+
- npm
- MySQL 8.x 或兼容版本
- Windows / macOS / Linux 均可运行

## 6. 环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

关键变量示例：

```env
SERVER_PORT=4173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=coffee
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174
```

不要提交真实 `.env`。

## 7. 安装与启动

```bash
npm install
```

初始化数据库：

```bash
npm run db:init
```

已有数据库只执行迁移：

```bash
node server/db/migrate.js
```

生成演示数据：

```bash
npm run db:demo
```

分别启动三端：

```bash
npm run dev:server
npm run dev:web
npm run dev:admin
```

或同时启动：

```bash
npm run dev:all
```

默认访问地址：

```text
后端 API：http://127.0.0.1:4173/api
用户端 Web：http://127.0.0.1:5173
后台 Admin：http://127.0.0.1:5174
```

## 8. 构建与测试

构建：

```bash
npm run build
```

推荐提交前执行：

```bash
node server/db/migrate.js
npm run db:check
npm run db:demo
npm run build
npm run smoke:web
npm run smoke:api
npm run check:motion
node scripts/check-project.js
git diff --check
```

项目内常用脚本：

```bash
npm run build:web
npm run build:admin
npm run check
npm run smoke
npm run test:request
npm run test:chunk
```

## 9. 默认与演示账号

默认管理员账号由 seed 脚本写入：

```text
username: admin
password: admin123456
```

演示用户账号由 `npm run db:demo` 写入。具体账号以 `server/db/seed-demo.js` 为准，文档建议使用以下角色进行演示：普通会员、银卡会员、金卡会员、黑金会员。

## 10. 重要业务说明

### 上传文件

上传文件使用 Multer，本地保存于：

```text
server/public/uploads/
```

`upload_files.user_id` 允许为空，后台商品、图书、活动等上传写入 `NULL`；用户头像、社区、评论上传需要真实用户 ID。外键策略为 `ON DELETE SET NULL`。

### 支付说明

当前支付为演示状态流转，不接入真实支付网关。

### 短信说明

手机号验证码登录为项目演示流程，实际生产环境需要接入真实短信服务。图形验证码由后端生成并校验。

### 时间规则

生日券、签到、统计等业务日期统一使用 Asia/Shanghai 业务日，统计查询使用闭开区间：`>= startOfDay AND < nextDayStart`。

## 11. 更多文档

- [项目结构说明](docs/项目结构说明.md)
- [接口文档](docs/接口文档.md)
- [数据库设计](docs/数据库设计说明.md)
- [系统架构说明](docs/系统架构说明.md)
- [演示指南](docs/演示指南.md)
- [测试说明](docs/测试说明.md)
- [安全测试报告](docs/安全测试报告.md)
- [前后台闭环人工回归清单](docs/前后台闭环人工回归清单.md)
- [交付说明](DELIVERY.md)
