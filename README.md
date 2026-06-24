# Coffee Book

Coffee Book 是一个集咖啡、阅读、社区、商城、空间预约和后台管理于一体的全栈平台。项目包含用户端 Web、后台管理端 Admin 和 Express 后端 API，适合用于咖啡书屋、复合文化空间或生活方式门店的业务演示与二次开发。

## 项目亮点

- 前台、会员中心、后台管理与 Express API 完整分层，核心页面按路由拆包。
- 商品、图书、活动、社区、预约、订单、积分与优惠券形成可演示的完整业务闭环。
- Coffee Book 多主题 Cursor、GSAP / Anime.js 微交互，并为触屏和 reduced-motion 自动降级。
- 统一 Skeleton、EmptyState、ErrorPanel 与可重试反馈，列表图片延迟加载并预留稳定容器。
- 前后台权限隔离、年度生日券幂等、积分事务、隐私边界和操作审计均有 smoke test 覆盖。

## 功能截图

交付仓库不内置环境相关截图，部署后可按以下槽位补充实际图片：

| 截图槽位 | 建议页面 | 展示重点 |
| --- | --- | --- |
| 前台首页 | `/` | 品牌首屏、精选图书、商品与活动 |
| 商城与图书 | `/coffee`、`/books` | 筛选、懒加载图片、加载与空状态 |
| 社区与预约 | `/community`、`/booking` | 内容互动、座位选择与状态反馈 |
| 会员中心 | `/account/points` | 积分、优惠券与生日福利 |
| 后台管理 | `/dashboard`、`/seats` | 数据概览、表格与座位拖拽 |

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
- 用户中心：昵称、头像、手机号、邮箱、性别、生日、个人简介和公开资料开关
- 积分中心：余额与流水、优惠券兑换、兑换记录和生日福利
- 头像上传
- 服务条款、隐私政策、关于我们、联系我们、帮助中心

### 后台管理端

- 仪表盘：业务汇总、趋势数据、最近订单和快捷入口
- 图书管理：图书新增、编辑、状态调整、库存维护和删除
- 商品管理：咖啡 / 文创商品新增、编辑、上下架、库存维护和删除
- 订单管理：订单筛选、详情查看、支付审核和订单状态更新
- 活动管理：活动新增、编辑、状态调整和删除
- 社区审核：帖子、评论和举报处理，以及精选内容维护
- 预约管理：预约查询及确认、完成、取消等状态处理
- 座位管理：座位地图、拖拽定位、座位新增 / 编辑 / 删除、维护状态和分时占用查询
- 用户管理：用户查询、积分余额、生日、优惠券数量、会员等级和账号状态
- 上传文件：上传记录筛选、预览和删除
- 操作日志：普通用户与管理员关键操作的用户、角色、操作类型、时间筛选和详情查看

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
npm run db:demo
```

`npm run db:demo` 会写入幂等演示账号和真实行为数据，包括订单、预约、活动报名、评论、点赞、积分、优惠券和通知。生产或正式数据环境不建议直接执行任何破坏性数据库重置。执行迁移前建议先备份数据库。

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
node server/db/migrate.js
npm run db:check
npm run build
npm run smoke:web
npm run smoke:api
npm run check:motion
node scripts/check-project.js
git diff --check
```

`smoke:web` 检查前后台关键路由与懒加载 chunk；`smoke:api` 使用真实 MySQL 数据覆盖鉴权、资料隐私、积分与优惠券幂等、生日券、商品、订单、社区、预约、座位坐标同步和后台日志筛选。

Phase 18 最终回归结果见 `DELIVERY.md`。构建验证前后台路由拆包，Web smoke 检查关键页面及异步 chunk，API smoke 覆盖真实 MySQL 业务链路，Motion 检查确保动画具备降级和清理边界。

## Phase 18：性能、加载体验与 SEO

- 首页和后台仪表盘保留首屏同步加载，其余业务页面继续使用动态 `import()`。
- 图书、商品、活动、社区列表图片使用 `loading="lazy"` 与异步解码；卡片视觉区域使用固定高度或比例降低布局偏移。
- 长列表 reveal / tilt 动画限制处理数量，Cursor 使用单一 RAF 循环，失焦、触屏及 reduced-motion 自动停止。
- 图书、商品、活动、社区、预约、积分和后台表格统一提供加载、空内容、错误与重试反馈。
- 前台按路由维护页面标题，并动态更新 description / keywords；后台设置 `noindex,nofollow`。

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

操作日志复用并扩展 `audit_logs`。除管理员操作外，普通用户的注册、登录、退出、资料与头像、下单与支付提交、预约、活动报名、发帖、评论、点赞、积分和优惠券变化也会记录。日志包含操作者、角色、动作、目标、说明、IP、User-Agent 和时间；密码、验证码、Token 等敏感字段会在入库前过滤。后台支持按用户、角色、操作类型和时间筛选。

### Phase 16 / 17

- 后台座位地图支持拖拽，坐标限制在地图范围内；保存失败会回滚并提示。前台预约地图读取 `seats.x/y`，刷新即可同步最新布局。
- 首页精选图书，以及图书、商品、活动、社区、搜索和推荐卡片统一补齐点击、键盘 Enter/Space 与装饰层 `pointer-events` 行为。
- 积分兑换在事务内锁定用户、校验余额并写入积分流水与优惠券记录；兑换请求带幂等键，重复提交不会重复扣分或发券。
- 用户生日当天登录或进入积分中心自动发放生日券，数据库年度唯一约束保证每年仅一次。
- 公开用户页只展示昵称、头像、性别、简介和公开内容，不返回手机号、邮箱或生日。

相关数据库结构：

```text
users.gender
users.birthday
users.bio
coupons
user_coupons
user_coupons.request_key
audit_logs.user_name / role / target_type / target_id / description / ip / user_agent
```

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
