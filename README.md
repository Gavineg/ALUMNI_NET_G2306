# G2306 蹭饭图

赛博朋克风格的班级同学去向可视化 + 后台管理系统。

## 技术栈

| 层 | 方案 |
|---|---|
| 前端托管 | Cloudflare Pages |
| API | Cloudflare Workers (ESM) |
| 数据库 | Cloudflare D1 (SQLite) |
| 认证 | JWT (PBKDF2-SHA256 密码哈希) |
| 地理编码 | 高德地图 Web API |

---

## 目录结构

```
cyberpunk_cengfan/
├── frontend/
│   ├── index.html          # 地图主页
│   ├── portal.html         # 后台统一入口（学生/管理员）
│   ├── css/
│   │   ├── base.css
│   │   ├── terminal.css
│   │   └── portal.css
│   └── js/
│       ├── config.js       # API 地址、常量
│       ├── boot.js         # 打字机 / BIOS 乱码动效
│       ├── map-data.js     # 从 Worker 拉取地图数据
│       ├── map-particles.js# 三层彗星粒子 + 节点渐显
│       ├── map-ui.js       # 终端面板交互
│       ├── auth.js         # 前端 JWT 工具
│       ├── student-portal.js
│       └── admin-portal.js
└── worker/
    ├── src/
    │   ├── index.js        # 路由入口
    │   ├── auth.js         # 密码哈希 + JWT
    │   ├── students.js     # 学生 CRUD + 地图数据聚合
    │   ├── geocode.js      # 代理高德 API
    │   └── profanity.js    # 违禁词过滤
    ├── schema.sql
    └── wrangler.toml
```

---

## 部署步骤

### 1. 创建 D1 数据库

```bash
cd worker
npx wrangler d1 create g2306-db
```

复制输出的 `database_id`，填入 `wrangler.toml` 里的 `REPLACE_WITH_YOUR_D1_DATABASE_ID`。

### 2. 初始化数据库表

```bash
npx wrangler d1 execute g2306-db --file=schema.sql
```

### 3. 设置环境变量

在 Cloudflare Dashboard → Workers → `g2306-cengfan-api` → Settings → Variables 里添加：

| 变量名 | 说明 |
|---|---|
| `JWT_SECRET` | 随机长字符串，用于签发 JWT，建议 32+ 字符 |
| `AMAP_KEY` | 高德地图 Web API Key（在高德开放平台申请） |

> 本地开发可在 `worker/` 目录下创建 `.dev.vars` 文件：
> ```
> JWT_SECRET=your-local-secret-here
> AMAP_KEY=your-amap-key-here
> ```

### 4. 部署 Worker

```bash
cd worker
npx wrangler deploy
```

记录部署后的 Worker URL（如 `https://g2306-cengfan-api.xxx.workers.dev`）。

### 5. 更新前端 API 地址

编辑 `frontend/js/config.js`，将 Worker URL 填入：

```js
export const API_BASE = window.location.hostname === 'localhost' || ...
  ? 'http://localhost:8787'
  : 'https://g2306-cengfan-api.YOUR_SUBDOMAIN.workers.dev'; // ← 改这里
```

### 6. 部署前端到 Cloudflare Pages

1. 将整个仓库推送到 GitHub
2. Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. 配置：
   - **Build output directory**: `frontend`
   - **Build command**: 留空（纯静态文件，无需构建）
4. 部署完成后可绑定自定义域名

### 7. 创建第一个管理员账号

```bash
# 本地执行（需要先 wrangler dev 跑起来）或直接用 wrangler d1 execute
npx wrangler d1 execute g2306-db --command "
INSERT INTO students (username, password_hash, salt, display_name, is_admin)
VALUES ('admin', 'TEMP', 'TEMP', 'Admin', 1);
"
```

然后登录后台 → Admin Access，通过管理界面重置密码（或直接通过 Worker API 创建）。

更推荐的方式：用 `wrangler dev` 起本地 Worker，访问 `http://localhost:8787/api/auth/login` 调试，然后通过管理员 API 创建账号。

---

## 本地开发

```bash
# Terminal 1：启动 Worker
cd worker
npx wrangler dev

# Terminal 2：启动前端静态服务
cd frontend
python -m http.server 3000
# 或
npx serve -l 3000
```

访问 `http://localhost:3000` 查看地图，`http://localhost:3000/portal.html` 进入后台。

---

## 功能说明

### 地图主页 (`index.html`)
- 赛博朋克风格中国地图，出发点为深圳（可在管理员后台修改）
- 启动时 BIOS 乱码动画 → 三层彗星粒子从出发点辐射向全国
- 目标节点按距离由近到远逐个点亮，配合横向扫描光柱
- 点击节点弹出终端解密面板，显示同学信息和蹭饭状态
- 节点颜色模式可选：统一色 / 按蹭饭状态区分（管理员后台设置）

### 后台门户 (`portal.html`)
两个 Tab 选择角色登录：

**学生后台**
- 修改大学（输入院校名 → 自动地理编码）
- 修改专业
- 切换蹭饭状态（AVAILABLE / OFFLINE）
- 填写自定义状态（100字，自动过滤违禁词）

**管理员后台**
- 学生管理：列表、搜索、新增、编辑、删除、重置密码
- 违禁词管理：添加/删除违禁词
- 地图外观设置：出发点（支持地理编码）、节点颜色模式、统一色拾色器

---

## 高德地图 API 申请

1. 注册 [高德开放平台](https://lbs.amap.com/) 账号
2. 控制台 → 应用管理 → 创建应用
3. 添加 Key，服务平台选 **Web服务**
4. 将 Key 填入 Worker 环境变量 `AMAP_KEY`

免费配额：每日 5000 次地点搜索，足够使用。
