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

## 4. 已完成功能

- 前台：首页、图书、咖啡商品、购物车、结算下单、模拟支付、会员订单、活动、社区、空间预约、登录注册
- 后台：Dashboard、图书管理、商品管理、订单管理、活动管理、社区审核、预约管理
- 后端：JWT 登录、admin 权限、MySQL 初始化与种子、CORS、smoke test

## 5. 默认管理员账号

```text
username: admin
password: admin123456
```

生产环境请及时替换默认账号或修改密码。

## 6. 本地启动步骤

```bash
npm install
cp .env.example .env
npm run db:init
npm run db:seed
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
4. 执行 `npm run db:init` 初始化 `coffee` 数据库。
5. 按需要执行 `npm run db:seed` 写入演示数据。
6. 配置 `apps/web/.env` 和 `apps/admin/.env` 的 `VITE_API_BASE_URL`。
7. 执行 `npm run build` 生成 `dist/web` 和 `dist/admin`。
8. 使用 Nginx 或静态服务器托管前台、后台静态资源。
9. 使用 `npm run start` 或 PM2 启动后端。
10. 配置 Nginx 将 API 域名反向代理到 Node 后端。

## 8. Smoke Test

后端启动后执行：

```bash
npm run smoke:api
```

预期结果：所有检查 PASS，并输出 `Smoke API passed`。

## 9. 安全注意事项

- 不提交 `.env`
- 不提交真实数据库密码
- 不提交真实 `JWT_SECRET`
- 生产环境使用强数据库密码和长随机 JWT 密钥
- `CORS_ORIGIN` 只配置可信前台和后台域名
- 后台 API 保持 `requireAdmin`
- 生产数据库定期备份

## 10. 未接入能力说明

当前项目未接入真实支付、短信、邮件、文件上传、WebSocket 实时通知和第三方推荐系统。支付为演示用模拟支付状态流转。

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
10. 访问 `http://127.0.0.1:5173/events`，操作：报名活动，预期：报名成功或容量提示。
11. 访问 `http://127.0.0.1:5173/community`，操作：发帖、评论、点赞，预期：社区交互正常。
12. 访问 `http://127.0.0.1:5173/booking`，操作：提交空间预约，预期：预约记录创建成功。

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
