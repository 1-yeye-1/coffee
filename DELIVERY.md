# Coffee Book 最终交付说明

## 1. 项目简介

Coffee Book 是一个咖啡与阅读空间全栈演示项目，包含前台主站、后台管理和后端 API。项目支持图书浏览、咖啡商品、购物车、订单、活动、社区、空间预约以及后台运营管理。

## 2. 架构说明

```text
apps/web      前台主站，面向普通用户
apps/admin    后台管理，面向管理员
server        后端 API，负责鉴权、业务接口和 MySQL 数据访问
```

三端通过 `VITE_API_BASE_URL` 和 `/api` 接口连接，后端通过 `CORS_ORIGIN` 控制允许访问的前端来源。

## 3. 技术栈

- Vue 3、Vue Router、Pinia、Vite
- Node.js、MySQL、mysql2
- JWT 登录鉴权
- 本地 Design System CSS 与基础组件
- GSAP 结构动画、Anime.js 微交互与共享 Motion Runtime

## 4. 已完成功能

- 前台：首页、图书、咖啡商品、购物车、结算下单、模拟支付、会员订单、活动、社区、空间预约、登录注册、完整个人资料和积分中心
- 后台：仪表盘、图书 / 商品 / 订单 / 活动管理、社区审核、预约管理、座位拖拽、用户积分与优惠券概览、上传文件、详细操作日志
- 后端：JWT 登录、admin 权限、MySQL 幂等迁移与种子、积分流水、优惠券兑换、年度生日券、详细审计日志、CORS 和 smoke test

Phase 16 已完成座位坐标拖拽保存与前台同步、用户和管理员关键操作日志、卡片点击与键盘访问修复。Phase 17 已完成积分中心、优惠券兑换及幂等保护、生日当天自动发券、个人资料字段和公开资料隐私边界。

数据库同步包含 `coupons`、`user_coupons`，以及 `users.gender`、`users.birthday`、`users.bio`；`user_coupons.request_key` 用于阻止同一兑换请求重复扣分。`audit_logs` 已补齐用户、角色、目标、说明、IP 和 User-Agent 字段。

## 5. 默认管理员账号

```text
username: admin
password: admin123456
```

生产环境请及时替换默认账号或修改密码。

## 6. 本地启动步骤

以下命令执行前必须先启动 MySQL，并确认其监听 `.env` 配置的 `DB_HOST:DB_PORT`。首次环境运行 `npm run db:init`；已有数据库可运行 `node server/db/migrate.js` 执行幂等迁移。

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev:server
npm run dev:web
npm run dev:admin
```

也可以使用：

```bash
npm run dev:all
```

本地访问：

```text
前台：http://127.0.0.1:5173
后台：http://127.0.0.1:5174
后端：http://127.0.0.1:4173/api
```

## 7. 生产部署步骤

1. 在服务器安装 Node.js 和 MySQL。
2. 创建后端 `.env`，配置 `DB_HOST`、`DB_USER`、`DB_PASSWORD`、`JWT_SECRET`、`CORS_ORIGIN`。
3. 执行 `npm install`。
4. 配置 `DB_NAME` 后执行 `npm run db:init`，完成建表、幂等 seed 和数据库一致性检查。
5. `db:init` 已包含幂等 seed；仅需单独补数据时执行 `npm run db:seed`，演示环境可继续执行 `npm run db:demo` 写入幂等演示账号和行为数据。
6. 配置 `apps/web/.env` 和 `apps/admin/.env` 的 `VITE_API_BASE_URL`。
7. 执行 `npm run build` 生成 `dist/web` 和 `dist/admin`。
8. 使用 Nginx 或静态服务器托管前台、后台静态资源。
9. 使用 `npm run start` 或 PM2 启动后端。
10. 配置 Nginx 将 API 域名反向代理到 Node 后端。

## 8. Smoke Test

提交或部署前执行：

```bash
node server/db/migrate.js
npm run db:check
npm run build
npm run smoke:web
npm run smoke:api
node scripts/check-project.js
```

预期结果：幂等迁移、数据库结构检查、前后台构建、路由 smoke、真实数据库 API 回归和项目静态检查全部通过。

2026-06-22 最终交付验证：`node server/db/migrate.js`、`npm run db:check`、`npm run build`、`npm run smoke:web`、`npm run smoke:api`、`node scripts/check-project.js` 均通过。Web / Admin 分别完成 270 / 179 个模块转换；API smoke 覆盖注册登录、资料隐私、积分兑换幂等、生日券年度唯一、后台用户与日志筛选、座位坐标同步及原有订单、社区、活动、预约流程。

## 9. 安全注意事项

- 不提交 `.env`
- 不提交真实数据库密码
- 不提交真实 `JWT_SECRET`
- 生产环境使用强数据库密码和长随机 JWT 密钥
- `CORS_ORIGIN` 只配置可信前台和后台域名
- 后台 API 保持 `requireAdmin`
- 公开用户接口不返回手机号、邮箱和生日
- 审计日志入库前过滤密码、验证码、Token 等敏感字段
- 积分扣减使用事务、用户行锁、余额校验和兑换幂等键，后台调整不得产生负积分
- 生产数据库定期备份

## 10. 未接入能力说明

当前项目未接入真实支付、真实短信 / 邮件发送、WebSocket 实时通知、第三方推荐系统和第三方对象存储。支付为演示用模拟支付状态流转；文件上传已通过 Multer 接入本地静态资源目录，并提供后台上传记录管理。

## 11. 最终演示路径

### 前台演示

1. 访问 `http://127.0.0.1:5173/`，操作：打开首页，预期：首页正常展示。
2. 访问 `http://127.0.0.1:5173/books`，操作：浏览图书列表，预期：图书数据正常展示。
3. 访问 `http://127.0.0.1:5173/coffee`，操作：浏览咖啡商品，预期：商品列表正常展示。
4. 访问 `http://127.0.0.1:5173/register`，操作：注册普通用户，预期：注册成功或提示用户名规则。
5. 访问 `http://127.0.0.1:5173/login`，操作：登录普通用户，预期：登录后回到前台。
6. 访问 `http://127.0.0.1:5173/coffee`，操作：加入购物车，预期：购物车数量更新。
7. 访问 `http://127.0.0.1:5173/cart`，操作：确认商品并进入结算，预期：结算页可打开。
8. 访问 `http://127.0.0.1:5173/checkout`，操作：提交订单并模拟支付，预期：订单状态更新。
9. 访问 `http://127.0.0.1:5173/account/orders`，操作：查看我的订单，预期：只显示当前用户订单。
10. 访问 `http://127.0.0.1:5173/account/profile`，操作：编辑个人资料，预期：字段保存且公开主页不显示手机号、邮箱、生日。
11. 访问 `http://127.0.0.1:5173/account/points`，操作：兑换优惠券，预期：积分扣减一次并生成兑换记录；生日当天生日券仅发放一次。
12. 访问 `http://127.0.0.1:5173/events`，操作：报名活动，预期：报名成功或容量提示。
13. 访问 `http://127.0.0.1:5173/community`，操作：发帖、评论、点赞，预期：社区交互正常。
14. 访问 `http://127.0.0.1:5173/booking`，操作：提交空间预约，预期：预约记录创建成功并使用数据库最新座位坐标。

### 后台演示

1. 访问 `http://127.0.0.1:5174/login`，操作：打开后台登录页，预期：不显示前台 Header/Footer。
2. 使用 `admin / admin123456` 登录，预期：进入 `/dashboard`。
3. 访问 `http://127.0.0.1:5174/dashboard`，操作：查看 Dashboard，预期：统计卡片正常展示。
4. 访问 `http://127.0.0.1:5174/books`，操作：管理图书，预期：列表、编辑、上下架可用。
5. 访问 `http://127.0.0.1:5174/products`，操作：管理商品，预期：列表、编辑、库存状态可用。
6. 访问 `http://127.0.0.1:5174/orders`，操作：管理订单，预期：订单状态可查看和更新。
7. 访问 `http://127.0.0.1:5174/events`，操作：管理活动，预期：活动 CRUD 可用。
8. 访问 `http://127.0.0.1:5174/community`，操作：审核社区内容，预期：通过、拒绝、精选等操作可用。
9. 访问 `http://127.0.0.1:5174/bookings`，操作：管理预约，预期：确认、到店、取消状态可用。
10. 访问 `http://127.0.0.1:5174/seats`，操作：拖拽座位并刷新前台预约页，预期：坐标保存并同步；新增、编辑、维护状态和删除可用。
11. 访问 `http://127.0.0.1:5174/users`，操作：管理用户，预期：积分、生日、优惠券数量、会员等级和账号状态清晰可见。
12. 访问 `http://127.0.0.1:5174/uploads`，操作：查看上传记录，预期：筛选、预览和删除可用。
13. 访问 `http://127.0.0.1:5174/logs`，操作：按用户、角色、动作和时间查看日志，预期：普通用户与管理员关键操作均可筛选并查看详情。

## 12. Phase 18：性能优化与交付展示

- 路由拆包审计完成：除前台首页和后台仪表盘外，主要业务页面均为动态 import。
- 图书、商品、活动、社区及后台缩略图统一延迟加载、异步解码；卡片图片容器保留稳定尺寸，降低 layout shift。
- 图书、商品、活动、社区补齐可重试错误状态；活动和社区增加列表 Skeleton 与统一 EmptyState。
- 预约、积分中心及后台表格继续复用既有 Skeleton、EmptyState、ErrorPanel 和 `aria-busy` 反馈。
- GSAP / Anime.js 列表动画保留数量上限与卸载清理；Cursor 保持 RAF、失焦停止和设备降级策略。
- 前台 title 随路由变化，description / keywords 动态同步；后台增加 `noindex,nofollow`。
- README 已补充项目亮点、截图槽位、完整功能清单、运行方式与验证命令。

## 13. Phase 18 最终验证

交付前执行以下命令：

```bash
npm run build
npm run smoke:web
npm run smoke:api
npm run check:motion
node scripts/check-project.js
git diff --check
```

2026-06-23 最终验证：以上六条命令全部通过。Web / Admin 构建分别转换 275 / 182 个模块；Web smoke 验证前后台路由与异步 chunk；API smoke 完整通过商城、图书、活动、社区、预约、积分、年度生日券及后台管理回归；Motion、项目结构与补丁格式检查均通过。
