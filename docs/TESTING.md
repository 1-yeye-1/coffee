# 测试说明

## 1. 测试目标

验证 Coffee Book 在前台、后台、后端 API、数据库结构、动画系统、演示数据和项目配置上的可运行性和一致性。

## 2. 推荐最终测试命令

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

## 3. 数据库迁移测试

命令：

```bash
node server/db/migrate.js
```

验证内容：

- 缺失表自动创建。
- 缺失字段幂等补齐。
- 外键和索引可重复执行。
- 不清空已有业务数据。

重点字段：

- `users.growth_value`
- `users.last_checkin_date`
- `upload_files.user_id` nullable
- `comments.parent_id`
- `comment_likes`
- `book_reservations`
- `seats.x/y/width/height/sort_order`

## 4. 数据库结构检查

命令：

```bash
npm run db:check
```

验证内容：

- 关键表存在。
- 关键字段存在。
- 关键索引存在。
- `expires_at` 类型符合预期。
- seed/demo 基线数据可支持 smoke 测试。

## 5. 演示数据幂等测试

命令：

```bash
npm run db:demo
npm run db:demo
```

预期：重复运行不会无限插入重复用户、订单、预约、评论、点赞、通知、优惠券等数据。

## 6. 构建测试

命令：

```bash
npm run build
```

验证内容：

- 前台 `build:web` 通过。
- 后台 `build:admin` 通过。
- Vue 模板语法无错误。
- 动态 import 和 chunk 可构建。

## 7. Web Smoke 测试

命令：

```bash
npm run smoke:web
```

验证内容：

- 前台关键路由可访问。
- 后台关键路由可访问。
- 动态 chunk 可加载。
- 主要页面不会白屏。

## 8. API Smoke 测试

命令：

```bash
npm run smoke:api
```

验证内容：

- 认证流程。
- 商品、图书、活动、社区、预约接口。
- 订单与支付模拟。
- 积分、优惠券、生日券、签到。
- 后台核心接口。
- 上传与权限关键链路。

## 9. Motion 检查

命令：

```bash
npm run check:motion
```

验证内容：

- GSAP / Anime 使用规范。
- RAF、事件监听、定时器清理。
- reduced-motion 降级。
- 避免危险布局动画属性。
- DOM 类型校验，避免对非 DOM 调用动画。

## 10. 项目检查

命令：

```bash
node scripts/check-project.js
```

验证内容：

- 项目结构完整。
- 关键文件存在。
- 基础配置合理。
- 无明显 TODO/FIXME/debugger 等问题。

## 11. Git 差异检查

命令：

```bash
git diff --check
```

预期：无 whitespace error。Windows 环境可能出现 LF/CRLF 提示，不应影响校验。

## 12. 关键手工测试点

### 前台

- 注册、登录两种模式。
- 获取验证码后图形验证码不异常刷新。
- 首页图片优先加载和动画正常。
- 商品详情、图书详情、活动详情、社区详情不白屏。
- 评论、回复、点赞、取消点赞。
- 购物车、下单、模拟支付。
- 座位预约分阶段流程和固定时间段。
- 积分签到、优惠券兑换、会员成长。
- 消息中心批量操作和点击跳转。
- BackToTop 按钮。

### 后台

- 后台登录。
- 商品/图书/活动图片上传。
- 编辑弹窗不因点击外部误关闭。
- 编辑支持部分更新。
- slug 不要求管理员手动填写。
- 多选、全选、批量操作。
- 社区审核批量操作。
- 座位拖拽保存，前台刷新同步。
- 用户管理查看成长值和签到。
- 操作日志筛选。

## 13. 测试结论模板

```text
node server/db/migrate.js      PASS
npm run db:check               PASS
npm run db:demo                PASS
npm run build                  PASS
npm run smoke:web              PASS
npm run smoke:api              PASS
npm run check:motion           PASS
node scripts/check-project.js  PASS
git diff --check               PASS
```
