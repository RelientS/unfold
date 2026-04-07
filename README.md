# Unfold · 电子手帐

帮用户在情绪模糊状态下看见自己内心的网页日记工具。核心体验是"内心状态视觉化"——用拼贴画布作为情绪的入口。

日系简约可爱插画风，兔子为圆润黑白线条风格，不主动打扰用户，在关键时刻温柔出现。

---

## 技术栈

| 层级 | 选型 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| 画布 | Fabric.js 5.x |
| 样式 | Tailwind CSS + CSS Modules |
| 动画 | Framer Motion |
| 状态 | Zustand |
| 数据库 | PostgreSQL (Supabase) |
| ORM | Drizzle ORM |
| 文件存储 | Supabase Storage |
| 认证 | Supabase Auth (魔法链接 + Google OAuth) |
| 兔子 AI | Anthropic Claude API (Haiku 实时对话) |
| 贴纸生成 | Replicate (Flux Schnell) |
| 邮件通知 | Resend |
| 部署 | Vercel + Supabase |

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
# 填入你的 Supabase / Anthropic / Replicate / Resend 密钥
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

### 4. 数据库迁移（生产环境）

```bash
npm run db:push   # 推送 schema 到 Supabase
npm run db:generate  # 生成迁移文件
```

---

## 项目结构

```
├── app/
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                 # 月历首页
│   ├── auth/
│   │   ├── login/page.tsx       # 登录页
│   │   └── callback/route.ts    # OAuth 回调
│   ├── editor/[date]/page.tsx   # 画布编辑器
│   └── api/
│       ├── entries/             # 日记条目 CRUD
│       ├── chat/                # 兔子对话（SSE 流式）
│       ├── capsules/           # 时间胶囊
│       ├── stickers/generate/   # AI 贴纸生成
│       └── templates/           # 模板列表
├── components/
│   ├── calendar/MonthCalendar.tsx
│   ├── canvas/
│   │   ├── FabricCanvas.tsx    # Fabric.js React 封装
│   │   ├── EditorToolbar.tsx
│   │   ├── RightPanel.tsx
│   │   └── TemplateGallery.tsx
│   ├── rabbit/RabbitCompanion.tsx
│   └── capsule/
│       ├── CapsuleModal.tsx
│       └── CapsuleNotification.tsx
├── db/schema/index.ts           # Drizzle ORM 所有表定义
├── lib/
│   ├── anthropic.ts             # Claude API + 兔子 System Prompt
│   ├── replicate.ts             # Flux Schnell 贴纸生成
│   └── supabase/               # Supabase 客户端
└── SPEC.md                      # 原始产品方案
```

---

## 功能模块

### 月历首页
- 月历视图，显示有内容的日期（含心情 emoji + 信封标记）
- 点击日期进入画布编辑器

### 画布编辑器
- 竖版 A5（640×900px）
- 工具栏：文字 / 图片 / 预设贴纸 / AI 生成贴纸 / 天气心情 / 背景 / 字体
- 自由拖拽 / 旋转 / 缩放（Fabric.js）
- 2 秒防抖自动保存
- `beforeunload` 同步保存保护

### 兔子精灵（Shiro）
- 右下角悬浮，不主动打扰
- 叙事疗法 + 艺术疗愈背景
- SSE 流式对话，每次最多 3-4 句，用省略号创造留白

### 时间胶囊
- 在编辑器内"封存时刻"
- 填写给未来自己的话 + 兔子问题
- 选择拆封时间（1/3/6/12 个月或自定义）
- 到期后首页出现拆封动画流程

### AI 贴纸
- 输入关键词 → Replicate Flux Schnell → 上传 Supabase Storage → 加入画布
- Prompt 模板：日系卡通风格、无文字、白背景

---

## 环境变量

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role（服务端） |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `REPLICATE_API_TOKEN` | Replicate API Token |
| `RESEND_API_KEY` | Resend API Key（邮件通知） |

---

## 部署到 Vercel

```bash
npm run build
vercel deploy --prod
```

或连接 GitHub 实现每次 push 自动部署。

> 注意：首次部署后需在 Vercel 环境变量中配置上述所有变量。
