# 项目结构说明

## 根目录

```text
coffee-book/
├─ apps/
├─ server/
├─ scripts/
├─ docs/
├─ .env.example
├─ .gitignore
├─ package.json
├─ package-lock.json
├─ README.md
└─ DELIVERY.md
```

- `package.json`：根目录统一脚本和依赖管理。
- `.env.example`：后端环境变量示例。
- `README.md`：项目入口文档。
- `DELIVERY.md`：最终交付说明。
- `docs/`：接口、数据库、架构、测试、演示等补充文档。

## apps/web 用户端

```text
apps/web/src/
├─ api/
├─ assets/
├─ components/
├─ layouts/
├─ router/
├─ stores/
└─ views/
```

- `api/`：前台接口封装，例如认证、商品、图书、社区、预约、会员等。
- `assets/`：前台样式、图片和静态资源。
- `components/`：前台通用组件和业务组件。
- `components/booking/`：预约相关组件。
- `components/community/`：社区帖子与评论组件。
- `components/notifications/`：消息中心组件。
- `layouts/`：前台布局，如公共布局、登录布局、会员中心布局。
- `router/`：前台路由和路由守卫。
- `stores/`：Pinia 状态管理。
- `views/public/`：公开页面：首页、商城、图书、活动、社区、预约、登录注册。
- `views/member/`：会员中心页面：积分、资料、订单、预约、优惠券、会员成长。

## apps/admin 后台端

```text
apps/admin/src/
├─ api/
├─ assets/
├─ components/
├─ layouts/
├─ router/
├─ stores/
└─ views/admin/
```

- `api/`：后台接口封装。
- `assets/`：后台样式和后台 UI 收敛样式。
- `components/`：后台基础表格、Modal、CRUD 表单等。
- `components/admin/AdminCrudView.vue`：商品、图书、活动等后台 CRUD 通用能力。
- `components/base/BaseTable.vue`：后台表格与多选/全选能力。
- `layouts/`：后台布局和登录布局。
- `router/`：后台路由与管理员鉴权。
- `stores/`：后台状态管理。
- `views/admin/`：Dashboard、商品、图书、订单、用户、社区、预约、座位、日志等页面。

## apps/shared 共享模块

```text
apps/shared/
├─ components/
├─ motion/
├─ styles/
├─ seo.js
└─ error-handlers.js
```

- `components/SeatMap.vue`：前后台统一座位地图组件。
- `components/BackToTop.vue`：全站返回顶部组件。
- `motion/`：GSAP、Anime、Cursor、SeatMap 动画封装。
- `styles/`：共享交互、Cursor、UI 收敛样式。
- `seo.js`：前台 SEO title / description / keywords 管理。
- `error-handlers.js`：Vue、router、window 全局错误兜底。

## server 后端

```text
server/
├─ routes/
├─ services/
├─ middlewares/
├─ db/
├─ sql/
├─ utils/
├─ public/uploads/
└─ index.js
```

- `index.js`：Express 后端入口。
- `routes/`：路由层，定义 API 路径和请求方法。
- `services/`：业务服务层，处理数据库查询和业务规则。
- `middlewares/`：鉴权、管理员权限、错误处理等。
- `db/migrate.js`：幂等数据库迁移。
- `db/seed.js`：基础种子数据。
- `db/seed-demo.js`：演示数据脚本。
- `sql/schema.sql`：完整建表结构。
- `utils/date.js`：Asia/Shanghai 业务日期工具。
- `utils/upload.js`：Multer 上传配置和文件名兼容处理。
- `utils/response.js`：统一响应格式。
- `public/uploads/`：本地上传文件。

## scripts 脚本

- `scripts/check-project.js`：项目结构与配置检查。
- `scripts/check-db-schema.js`：数据库关键表字段索引检查。
- `scripts/smoke-web.js`：前后台路由和 chunk smoke 测试。
- `scripts/run-api-smoke.js` / `scripts/smoke-api.js`：API smoke 测试。
- `scripts/check-motion.js`：动画和 motion 使用规范检查。
- `scripts/test-request.js`：请求封装测试。
- `scripts/test-chunk-recovery.js`：动态 chunk 恢复测试。
- `scripts/dev-all.js`：本地三端并行启动脚本。
