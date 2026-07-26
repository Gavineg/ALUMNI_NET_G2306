# G2306 蹭饭图

赛博朋克风格的班级同学去向可视化 + 后台管理系统。

## 技术栈

| 层 | 方案 |
|---|---|
| 前端托管 | Cloudflare Pages（推送即自动部署） |
| API | Cloudflare Workers (ESM) |
| 数据库 | Cloudflare D1 (SQLite) |
| 认证 | JWT（PBKDF2-SHA256 密码哈希） |
| 地理编码 | 高德地图 Web API |

---

## 目录结构

```
cyberpunk_cengfan/
├── frontend/
│   ├── index.html              # 地图主页
│   ├── admin.html              # 管理员后台
│   ├── css/
│   │   ├── base.css            # 全局变量、CRT 特效、通用样式
│   │   ├── terminal.css        # 终端面板、信息框
│   │   └── portal.css          # 后台门户样式
│   └── js/
│       ├── config.js           # API 地址、全局常量
│       ├── boot.js             # 打字机 / BIOS 乱码动效
│       ├── map-data.js         # 从 Worker 拉取地图数据
│       ├── map-particles.js    # 彗星粒子、节点渐显动画、Canvas 流光
│       ├── map-ui.js           # 终端面板交互（城市/大学/学生信息）
│       ├── noise-worker.js     # Web Worker：CRT 噪点离屏渲染
│       ├── terminal-cmd.js     # 终端输入框主逻辑
│       ├── terminal-cmd-basic.js   # 基础命令（help、reboot、find 等）
│       ├── terminal-cmd-advanced.js # 高级命令（需 KONAMI 解锁）
│       ├── vfs.js              # 虚拟文件系统（cat/ls/cd 等命令用）
│       ├── yearbook.js         # 彩蛋：毕业纪念册
│       ├── auth.js             # 前端 JWT 工具
│       ├── student-portal.js   # 学生后台逻辑
│       └── admin-portal.js     # 管理员后台逻辑
└── worker/
    ├── src/
    │   ├── index.js            # 路由入口
    │   ├── auth.js             # 密码哈希 + JWT
    │   ├── students.js         # 学生 CRUD + 地图数据聚合
    │   ├── geocode.js          # 代理高德 API
    │   └── profanity.js        # 违禁词过滤
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
4. 推送到 `main` 分支后自动重新部署

### 7. 创建第一个管理员账号

```bash
npx wrangler d1 execute g2306-db --command "
INSERT INTO students (username, password_hash, salt, display_name, is_admin)
VALUES ('admin', 'TEMP', 'TEMP', 'Admin', 1);
"
```

然后访问 `admin.html` 登录，通过管理界面重置密码。

---

## 本地开发

```bash
# Terminal 1：启动 Worker
cd worker
npx wrangler dev

# Terminal 2：启动前端静态服务
cd frontend
npx serve -l 3000
```

访问 `http://localhost:3000` 查看地图，`http://localhost:3000/admin.html` 进入管理后台。

---

## 功能说明

### 地图主页 (`index.html`)

- 赛博朋克风格中国地图，出发点默认为深圳（管理员后台可修改）
- 启动序列：BIOS 乱码动画 → 彗星粒子从出发点辐射向全国 → 节点逐个点亮
- 手机端自动计算最优视角（包含所有节点的最大缩放），粒子在缩放完成后启动
- 点击节点弹出终端解密面板，显示同学信息和蹭饭状态；面板内容加载完成后可自由拖动地图
- 节点颜色模式：统一色 / 按蹭饭状态区分（管理员后台设置）
- 内置终端命令行，输入 `help` 查看可用命令；`KONAMI` 序列可解锁高级命令

**终端命令（基础）**

| 命令 | 说明 |
|---|---|
| `help` | 显示帮助 |
| `find <name>` | 在地图上定位同学 |
| `reboot [-f]` | 刷新页面；`-f` 同时清除缓存 |
| `stats` | 显示班级统计数据 |
| `whoami` | 显示当前登录用户 |

### 管理员后台 (`admin.html`)

- 学生管理：列表、搜索、新增、编辑、删除、重置密码
- 违禁词管理：添加 / 删除
- 地图外观设置：出发点坐标（支持地名地理编码）、节点颜色模式、统一色拾色器

### 学生自助（需登录）

通过终端命令 `login` 登录后可用：

- 修改所在大学（输入院校名，自动地理编码）
- 修改专业
- 切换蹭饭状态（AVAILABLE / OFFLINE）
- 填写自定义状态（100 字以内，自动过滤违禁词）

---

## 高德地图 API 申请

1. 注册 [高德开放平台](https://lbs.amap.com/) 账号
2. 控制台 → 应用管理 → 创建应用
3. 添加 Key，服务平台选 **Web服务**
4. 将 Key 填入 Worker 环境变量 `AMAP_KEY`

免费配额：每日 5000 次地点搜索，足够日常使用。
