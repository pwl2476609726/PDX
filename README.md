# Pulse Works Market

这个仓库现在有两条路线：

1. `docs/`：给 GitHub Pages 用的静态公开收款页
2. `src/` + `prisma/`：原来的 `Next.js + TypeScript + Prisma + PostgreSQL` 商城原型

如果你当前的目标是“让别人直接打开页面、看到商品、扫码付款后联系客服”，优先使用 `docs/` 这套静态页。

## GitHub Pages 静态收款页

静态公开页入口：

```text
docs/index.html
```

当前静态页已经具备：

- 3 个商品的公开展示
- `Antigravity Pro家庭组` 3 档规格
- 支付宝付款弹窗
- 微信付款弹窗
- “下单后请联系客服”固定提示
- 客服信息展示区
- GitHub Pages 可直接托管

### 本地可视化编辑入口

如果你要在本机可视化修改商品展示页信息，现在直接运行：

```bash
npm run dev
```

然后打开：

```text
http://localhost:3000/admin/site-content
```

这个页面不依赖数据库，只在本地开发环境开放。你可以在里面修改：

- 购买须知
- 收款码
- 客服信息
- 商品图片
- 商品名称
- 商品简介
- 商品库存
- 多规格价格

保存后会直接同步到：

- `docs/data/store-config.json`
- `docs/assets/pay/`
- `docs/assets/products/`

### 你需要替换的内容

1. 收款码图片：

- `docs/assets/pay/alipay.svg`
- `docs/assets/pay/wechat.svg`

2. 客服联系方式：

编辑：

```text
docs/app.js
```

把 `contact` 里的占位 QQ、微信、Telegram 改成你的真实联系方式。

3. 商品文案和价格：

同样编辑：

```text
docs/app.js
```

### GitHub Pages 发布步骤

1. 把仓库推到 GitHub
2. 打开仓库 `Settings`
3. 进入 `Pages`
4. 选择 `Deploy from a branch`
5. Branch 选 `main`
6. Folder 选 `/docs`
7. 保存并等待构建完成
8. GitHub 会给你一个公开链接

如果后面要绑定自己的域名，再增加：

```text
docs/CNAME
```

## Next.js 商城原型

原来的商城原型仍然保留，当前版本已经支持：

- 首页、商品详情页、订单查询页、订单结果页
- 商品多规格定价
- 游客下单
- 支付创建接口
- `MANUAL` 手动发货模式
- `AUTO_STOCK` 自动库存发货能力预留
- 后台商品/分类/公告/库存/订单管理
- 后台人工录入交付内容
- mock 支付联调

## 你自己怎么打开

1. 复制环境变量模板：

```bash
copy .env.example .env
```

2. 启动 PostgreSQL：

```bash
docker compose up -d
```

3. 初始化数据库：

```bash
npx prisma migrate dev --name init
npm run db:seed
```

4. 启动开发服务器：

```bash
npm run dev
```

5. 在浏览器打开：

```text
http://localhost:3000
```

后台地址：

```text
http://localhost:3000/admin/login
```

## 别人怎么打开

### 临时测试给别人看

本机启动后，用公网隧道工具把本地 `3000` 端口映射出去。

常见方式：

- `cloudflared tunnel --url http://localhost:3000`
- `ngrok http 3000`

得到公网地址后发给别人即可。

注意：

- 这只适合测试
- 不适合正式卖货
- 电脑关机、断网、隧道失效后链接就打不开

### 正式发给别人长期访问

正式卖货不能只靠 `localhost` 或临时隧道，必须部署到公网服务器并绑定域名。

推荐路线：

1. 准备一台云服务器
2. 准备一个域名
3. 域名解析到服务器
4. 服务器安装 Docker / Node.js / PostgreSQL
5. 部署项目并配置 `.env`
6. 用 Nginx 或 Caddy 做反向代理和 HTTPS
7. 把域名发给别人访问

如果后面要正式接支付宝/微信并长期卖货，优先走：

- 国内云服务器
- 备案域名
- HTTPS
- 独立数据库

## 当前默认商品

`db:seed` 默认会写入这 3 个商品：

1. `Gemini Pro家庭组（20XX年XX月XX日到期）`
   规格：`标准版|10`
2. `AnyRouter API令牌`
   规格：`100刀额度|12`
3. `Antigravity Pro家庭组`
   规格：
   - `1个月有效期|50`
   - `4个月有效期|88`
   - `1年有效期|150`

首期都按人工发货模式处理。

## 发货模式

### MANUAL

- 用户支付成功后，订单进入 `已支付，等待人工发货`
- 管理员在后台订单页录入交付内容
- 买家在订单页或查询页查看最终内容

### AUTO_STOCK

- 仍保留库存池模型
- 适合以后接回卡密、兑换码、预存账号自动发货

## 主要路由

- `/` 首页
- `/product/[slug]` 商品详情
- `/query` 订单查询
- `/order/[no]` 订单结果
- `/admin` 后台首页
- `/admin/products` 商品与规格管理
- `/admin/inventory` 库存导入
- `/admin/orders` 订单与人工发货
- `/admin/announcements` 公告管理

## API

- `POST /api/checkout/orders`
- `POST /api/payments/{provider}/create`
- `POST /api/payments/{provider}/notify`
- `POST /api/orders/query`
- `POST /api/admin/inventory/import`
- `POST /api/admin/orders/{id}/fulfill`
- `POST /api/jobs/release-expired`

## 支付说明

默认 `PAYMENT_MODE="mock"`。

本地联调时：

- 下单后会进入 mock 支付页
- 点击按钮会模拟支付成功
- `MANUAL` 商品会进入待人工发货状态

切到正式支付前，需要在 `.env` 中补齐：

- 支付宝商户参数
- 微信支付商户参数
- 对外可访问的回调地址

## 默认管理员

管理员账号从 `.env` 读取：

- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`

## 已验证

- `npx prisma generate`
- `npm run lint`
- `npm run build`
