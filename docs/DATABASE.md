# 数据库设计说明

## 1. 总体说明

Coffee Book 使用 MySQL 保存用户、商品、图书、活动、社区、预约、订单、积分、优惠券、上传和审计日志等数据。数据库结构以 `server/sql/schema.sql` 为基线，通过 `server/db/migrate.js` 进行幂等增量迁移，并由 `scripts/check-db-schema.js` 检查关键表、字段和索引。

业务日期统一按 Asia/Shanghai 处理，统计范围使用闭开区间：

```sql
created_at >= startOfDay AND created_at < nextDayStart
```

## 2. 用户与管理员

### users
普通用户表。核心字段：

- `id`
- `phone`
- `password_hash`
- `nickname`
- `avatar_url`
- `gender`
- `birthday`
- `bio`
- `profile_public`
- `points`
- `growth_value`
- `last_checkin_date`
- `status`
- `created_at`

说明：
- `growth_value` 用于会员等级。
- `last_checkin_date` 用于每日签到防重复。
- 手机号、邮箱、生日等隐私字段不在公开主页返回。

### admin_users
后台管理员表。管理员不属于普通用户表，因此后台上传图片时 `upload_files.user_id` 可以为 `NULL`。

## 3. 商品、订单与支付

### products
商品表。包含商品名称、slug、价格、库存、封面图、分类、上架状态、销量等字段。

### cart_items
购物车表。关联 `user_id` 和 `product_id`。

### orders
订单主表。保存订单号、用户、金额、状态、收货/联系信息等。

### order_items
订单明细表。关联订单和商品，保存购买时价格、数量、制作方式等。

### payments
支付记录表。`expires_at` 允许为空，支付为演示状态流转。

### product_reviews
商品评论表。核心字段：

- `product_id`
- `user_id`
- `rating`
- `comment`
- `parent_id`
- `created_at`

同一用户对同一商品只保留一条主评论，可更新；回复通过 `parent_id` 表示。

## 4. 图书与图书预约

### books
图书表。包含书名、作者、封面、分类、slug、简介、状态、座位绑定等。

重要字段：

- `seat_id`
- `location_label`

说明：图书可绑定到座位或区域，便于预约时展示位置。

### book_reservations
图书预约表。关联用户和图书，防止重复预约，支持取消。

### book_reviews
图书评论表。支持评分、评论、二级回复与点赞。

## 5. 活动

### events
活动表。包含标题、slug、封面、时间、地点、容量、状态等。

### event_registrations
活动报名表。支持报名、取消报名、重新报名，以及出席状态记录。

## 6. 社区、评论、点赞

### posts
社区帖子表。包含标题、内容、作者、图片、状态、精选、发布时间等。

### comments
通用社区评论表。核心字段：

- `id`
- `post_id`
- `user_id`
- `content`
- `parent_id`
- `status`
- `created_at`

`parent_id` 为自引用字段，用于二级回复。

### comment_likes
评论点赞表。核心字段：

- `comment_id`
- `user_id`

通过唯一索引保证同一用户对同一评论只能点赞一次。

### content_reports
内容举报表。用于后台社区审核。

## 7. 空间预约与座位

### seats
座位表。重要字段：

- `id`
- `name`
- `area`
- `capacity`
- `status`
- `x`
- `y`
- `width`
- `height`
- `sort_order`

说明：`x/y/width/height` 用于前后台统一 SeatMap。后台拖拽保存坐标，前台预约刷新后同步显示。

### bookings
座位预约表。保存用户、座位、预约日期、开始时间、结束时间、联系人、手机号、备注、状态等。

固定时间段由前端映射为 `start_time` 和 `end_time` 提交。

## 8. 积分、优惠券与会员成长

### user_points
积分流水表。记录积分增加、消耗、签到、兑换、订单抵扣等。

### coupons
优惠券定义表。包含券名、积分成本、优惠金额、门槛、有效期等。

### user_coupons
用户优惠券表。包含用户、券码、来源、状态、发放年份、有效期。生日券通过唯一索引防止同年重复领取。

### 会员成长
会员等级依据 `users.growth_value`：

- 普通会员：0+
- 银卡会员：500+
- 金卡会员：1500+
- 黑金会员：3000+

每日签到奖励 10 积分和 10 成长值，按 Asia/Shanghai 日期防重复。

## 9. 通知消息

### user_notifications
保存用户通知。常见字段：

- `user_id`
- `title`
- `content`
- `type`
- `related_type`
- `related_id`
- `target_url`
- `is_read`
- `is_pinned`
- `created_at`

消息中心可根据 `target_url` 或 `related_type + related_id` 跳转业务页面。

## 10. 上传文件

### upload_files
上传记录表。核心字段：

- `user_id`
- `scene`
- `file_type`
- `original_name`
- `stored_name`
- `mime_type`
- `size`
- `url`
- `storage_path`

重要规则：

- `user_id` 可空。
- 外键：`FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`。
- 用户头像、社区、评论上传必须有真实 `users.id`。
- 后台商品、图书、活动、banner、system 上传允许 `user_id = NULL`。

## 11. 审计日志

### audit_logs
记录管理员与普通用户关键操作：

- 登录、注册、退出
- 修改资料、上传头像
- 下单、支付、取消订单
- 预约、取消预约
- 活动报名、取消报名
- 发帖、评论、点赞、取消点赞
- 积分变化、优惠券兑换、签到
- 后台 CRUD、审核、批量操作、座位拖拽

敏感字段如密码、验证码、token 会被过滤。

## 12. 结构同步检查

最终应确保以下内容在 `schema.sql`、`migrate.js`、`check-db-schema.js` 和真实数据库中一致：

- `users.growth_value`
- `users.last_checkin_date`
- `coupons`
- `user_coupons`
- `user_points`
- `audit_logs`
- `upload_files.user_id nullable`
- `upload_files ON DELETE SET NULL`
- `book_reviews`
- `product_reviews`
- `comment_likes`
- `comments.parent_id`
- `book_reservations`
- `seats x/y/width/height/sort_order`
- `verification_codes.expires_at`
- `payments.expires_at`
- `user_notifications`
