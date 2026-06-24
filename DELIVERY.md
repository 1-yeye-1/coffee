# Coffee Book 最终交付说明

## 1. 交付概述

Coffee Book 是一个集咖啡商城、图书阅读、活动报名、社区互动、空间预约、会员积分和后台运营管理于一体的全栈 Web 项目。系统包含用户端 Web、后台管理端 Admin 和 Express 后端 API，使用 MySQL 保存真实业务数据。

本交付版本已经完成前后台核心功能、数据库迁移、演示数据脚本、Smoke 测试、UI 收敛、数据层统一和最终文档整理，适合作为课程项目、答辩展示或二次开发基础。

## 2. 已完成功能清单

### 2.1 用户端

- 首页展示：精选咖啡、精选图书、社区统计、图片优先加载、Skeleton 与 ErrorPanel。
- 商品商城：商品列表、分类、详情、购物车、下单、模拟支付、商品评论、点赞和回复。
- 图书中心：图书列表、详情、收藏、图书预约、图书位置绑定、图书评论、点赞和回复。
- 活动中心：活动列表、分类、详情、报名、取消报名、日历模式点击详情。
- 社区交流：帖子列表、详情、发帖、评论、二级回复、点赞、举报。
- 空间预约：统一咖啡书屋 SeatMap、固定时间段、分阶段流程、确认信息提交。
- 登录注册：密码登录、手机号验证码登录、图形数字验证码、密码可见切换。
- 消息中心：已读、删除、置顶、批量操作、点击跳转业务区域。
- 会员中心：资料、头像、订单、预约、活动、收藏、积分、优惠券。
- 会员成长：成长值、等级、权益、每日签到、积分奖励。
- 全局体验：多主题 Cursor、BackToTop、loading/empty/error、全局错误兜底。

### 2.2 后台管理端

- Dashboard：真实数据库统计、订单趋势、用户趋势、运营概览。
- 商品管理：商品 CRUD、图片上传、上架/下架、批量操作。
- 图书管理：图书 CRUD、封面上传、位置绑定、显示/隐藏、批量操作。
- 活动管理：活动 CRUD、发布/下线、日历联动、批量操作。
- 社区审核：帖子、评论、举报审核；通过、驳回、隐藏；批量操作。
- 订单管理：订单列表、状态更新、批量标记处理/完成。
- 预约管理：预约确认、取消、批量处理。
- 座位管理：后台拖拽座位坐标，前台预约地图同步。
- 用户管理：用户状态、会员等级、成长值、签到信息、批量启用/禁用。
- 操作日志：关键行为记录、筛选、详情、多选查看数量。
- 上传管理：后台上传图片，上传记录入库，用户/管理员上传场景区分。

### 2.3 后端与数据库

- Express API 服务。
- JWT 鉴权，用户与管理员权限隔离。
- MySQL 数据持久化。
- 幂等迁移与结构检查。
- 真实演示数据脚本。
- 审计日志。
- 统一统计服务。
- 统一错误处理。
- 上传文件记录与本地静态访问。

## 3. 数据库说明

核心表包括：

- 用户与权限：`users`、`admin_users`
- 商品与订单：`products`、`cart_items`、`orders`、`order_items`、`payments`
- 图书与预约：`books`、`book_reviews`、`book_reservations`
- 活动：`events`、`event_registrations`
- 社区：`posts`、`comments`、`comment_likes`、`content_reports`
- 空间预约：`seats`、`bookings`
- 积分优惠券：`user_points`、`coupons`、`user_coupons`
- 通知：`user_notifications`
- 上传：`upload_files`
- 审计：`audit_logs`

重要同步点：

- `users.growth_value`、`users.last_checkin_date` 用于会员成长和签到。
- `upload_files.user_id` 允许为空，外键为 `ON DELETE SET NULL`。
- `comments.parent_id` 支持二级回复。
- `comment_likes` 控制评论点赞唯一性。
- `seats.x/y/width/height/sort_order` 支持前后台统一座位地图。
- `verification_codes.expires_at` 和 `payments.expires_at` 使用明确日期时间类型。

详细说明见 [`docs/DATABASE.md`](docs/DATABASE.md)。

## 4. 接口说明概览

接口按模块划分：认证、用户、商品、图书、活动、社区、评论、预约、消息、积分优惠券、后台管理、上传。详细接口见 [`docs/API.md`](docs/API.md)。

重点流程：

- 密码登录：手机号 + 密码 + 图形验证码。
- 手机验证码登录：手机号 + 图形验证码 + 短信验证码。
- 商品评论：购买后评论，支持点赞和二级回复。
- 图书评论：预约或借阅后评论，支持点赞和二级回复。
- 座位预约：选择对象、选择日期与固定时间段、填写信息、确认提交。
- 后台上传：商品/图书/活动图片上传不触发表单保存，上传者可为管理员场景的 `NULL user_id`。

## 5. 运行方式

```bash
npm install
cp .env.example .env
npm run db:init
npm run db:demo
npm run dev:server
npm run dev:web
npm run dev:admin
```

访问地址：

```text
前台：http://127.0.0.1:5173
后台：http://127.0.0.1:5174
API：http://127.0.0.1:4173/api
```

默认管理员：

```text
username: admin
password: admin123456
```

## 6. 演示数据说明

执行：

```bash
npm run db:demo
```

会生成：

- 不同会员等级演示用户。
- 商品订单、支付、订单明细。
- 座位预约、图书预约、活动报名。
- 商品评论、图书评论。
- 社区帖子、评论、回复、点赞。
- 积分流水、签到、优惠券。
- 通知消息与审计日志。

脚本使用固定手机号、邮箱、订单号、预约号、slug、request_key 等方式保证幂等，重复执行不会无限插入重复数据。

## 7. 测试与验证结果

推荐最终验证命令：

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

预期：全部通过，仅可能出现 Windows LF/CRLF 换行提示，不应出现 whitespace error。

测试说明见 [`docs/TESTING.md`](docs/TESTING.md)。

## 8. 已知限制

- 支付为模拟支付，不接入真实支付网关。
- 短信验证码为演示流程，生产环境需接入真实短信服务。
- 上传使用本地目录，生产建议迁移对象存储。
- 不包含 WebSocket 实时通知，消息刷新以接口查询为主。
- 日志不提供强制删除能力，避免审计数据被误删。
- 部分演示数据为固定样例，适合展示，不代表真实运营数据。

## 9. 最终交付结论

Coffee Book 已完成前后台完整闭环、核心业务流程、数据库持久化、后台批量管理、评论互动、会员成长、预约座位、演示数据、测试脚本与文档整理。项目可以用于课程作业交付、答辩演示和继续二次开发。
