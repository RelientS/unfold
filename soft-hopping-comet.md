# unfold 电子手帐 — 技术架构方案

## Context
unfold 是一款**赛博手帐**产品——把实体手帐文化（买和纸胶带、剪贴照片、摆贴纸）的拼贴装饰体验搬到数字世界。
美学方向是**日系简约可爱插画风**：圆润线条、柔和配色、kawaii 小插画贴纸，不是极简功能派，而是有温度的手作感。
核心用户心智是手帐爱好者：unfold 是她们在浏览器里的那套仪式感等价物。
本文档为产品的完整技术选型与架构设计，供开发启动时参考。

---

## 技术选型

| 层级 | 选型 | 理由 |
|------|------|------|
| 框架 | Next.js 14 (App Router) | SSR + API Routes 合体，单仓库部署 |
| 画布 | Fabric.js 6.x | 原生 JSON 序列化/反序列化，自由拖拽成熟方案 |
| 样式 | Tailwind CSS + CSS Modules | 全局布局用 Tailwind，画布编辑器用 CSS Modules |
| 动画 | Framer Motion | 兔子出入场、胶囊封存仪式 |
| 状态 | Zustand | 轻量，画布编辑器局部状态 |
| 数据库 | PostgreSQL (Supabase) | 含 Auth + RLS + pg_cron，免费额度充足 |
| ORM | Drizzle ORM | 类型安全，比 Prisma 轻 |
| 文件存储 | Supabase Storage | 私有桶 + 签名 URL，与 Auth RLS 集成 |
| 认证 | Supabase Auth | 魔法链接（无密码更契合产品气质）+ Google OAuth |
| 兔子 AI | Anthropic Claude API | Haiku 实时对话，Sonnet 深度反思场景 |
| 贴纸生成 | Replicate API (Flux Schnell) | $0.003/张，3-4s，可控 prompt 模板 |
| 邮件通知 | Resend | 3000封/月免费 |
| 部署 | Vercel + Supabase | 零配置，免费额度可支撑冷启动 |

**月成本估算（中等流量）：$1–$21/月**

> **赛博手帐侧重功能调整（相较纯情绪工具）：**
> - 素材库权重高于 AI 分析：大量预设贴纸模板、和纸纹理背景、花边边框元素
> - 排版辅助：网格/点阵/横线辅助线，元素对齐吸附
> - 模板系统：预设手帐版式（周计划、旅行记录、月总结），用户可从模板起步
> - 手写字体优先：大量日系手写字体可选（Shippori Mincho、Zen Kurenaido 等）
> - 兔子/情绪功能为辅助层，不作为首要入口

---

## 数据模型

### `profiles`（扩展 Supabase auth.users）
```
id uuid PK, username, avatar_url, timezone, created_at
```

### `diary_entries`（核心表）
```
id uuid PK
user_id uuid FK
entry_date date                 -- 日历日期
canvas_state jsonb              -- Fabric.js canvas.toJSON() 完整状态
thumbnail_url text              -- 400×300 缩略图，用于月历展示
template_id text                -- 起始模板（weekly|travel|monthly|blank）
mood text                       -- serene|joyful|heavy|anxious|tender
weather text                    -- sunny|cloudy|rainy|snowy
background_id text              -- 纸张纹理 / 颜色背景 key
font_id text
is_sealed boolean
UNIQUE(user_id, entry_date)
```

**canvas_state 示例结构：**
```json
{
  "version": "6.0.0",
  "objects": [
    {"type":"image","src":"supabase-path","left":120,"top":80,"angle":-5},
    {"type":"textbox","text":"...","fontFamily":"Shippori Mincho","left":300},
    {"type":"image","src":"sticker-path","angle":12}
  ],
  "background":"#f5f0e8"
}
```

### `stickers`
```
id, user_id(可空=预设), source(preset|ai_generated|user_uploaded),
keyword, image_url, thumbnail_url,
category text   -- washi_tape|photo_frame|deco|food|nature|travel|mood
style_tag text  -- cute|ink|minimal|retro
```

### `templates`（手帐版式）
```
id text PK          -- 'weekly' | 'travel' | 'monthly' | 'blank' 等
name text
preview_url text    -- 版式缩略图
canvas_state jsonb  -- 预填充好辅助线、标题框等的初始画布 JSON
category text       -- planning|journal|travel|seasonal
```

### `letters`（信件）
```
id UUID PK
user_id UUID FK
content text                  -- 信件正文（用户写给未来自己的话）
topic text                    -- 主题关键词（如"A"，从原文中提取）
trigger_source text            -- 'rabbit' | 'diary_selection'
trigger_time timestamptz       -- 何时送达
status text DEFAULT 'sealed'  -- sealed → delivered → opened
sealed_at timestamptz
delivered_at timestamptz
opened_at timestamptz
linked_response_entry_id UUID FK  -- 回应时创建的新条目
```

### `chat_sessions` + `chat_messages`
```
sessions: id, user_id, entry_id, created_at, ended_at
messages: id, session_id, role(user|assistant), content, created_at
```
存储对话历史，让兔子跨 session 保持连续感。

---

## 关键 API 设计

```
GET  /api/entries?year=&month=       月历数据（含缩略图）
GET  /api/entries/:date              完整画布状态
POST /api/entries                    创建/更新画布（含异步生成缩略图）

POST /api/stickers/generate          关键词 → Replicate → 存 Supabase → 返回 URL
POST /api/stickers/upload            用户上传图片为贴纸

POST /api/chat                       流式 Claude 对话（SSE）；检测到"未来的我"意图时返回 letter_intent 信号；注入记忆上下文
GET  /api/agent/notifications        轮询 Gentle Prompt（RabbitCompanion 前端每60s调用）
POST /api/letters                    创建信件
GET  /api/letters                    列表（含 delivered 待拆的信件）
POST /api/letters/:id/open           拆信
GET  /api/letters/due                查询所有已送达待拆的信件
```

---

## AI 集成细节

---

## Bunny Agent 架构（记忆 + 主动触发）

### 三层记忆架构（Mem0 风格）

```
┌─────────────────────────────────────────────────────┐
│  Working Memory（内存，会话级）                        │
│  - 当前对话上下文、情绪状态、用户偏好                  │
│  - 兔子语言风格配置、当前 session 状态                │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase sync (启动时 + 定期)
┌──────────────────────▼──────────────────────────────┐
│  Episodic Memory（SQLite 本地文件）                   │
│  - 日记摘要、关键事件标记                            │
│  - 重要性评分 + 衰减机制                            │
│  - sql.js WASM，无原生依赖                          │
└──────────────────────┬──────────────────────────────┘
                       │ 每日 consolidation cron
┌──────────────────────▼──────────────────────────────┐
│  Semantic Memory（Supabase pgvector）               │
│  - 长期模式、用户偏好、学习到的事实                  │
│  - 向量相似度检索，跨日记模式发现                   │
└─────────────────────────────────────────────────────┘
```

**记忆流程：**
1. 用户写日记 → Supabase `diary_entries` 表
2. 启动时 `fullSync()` 将近期日记同步至本地 SQLite（`episodic_memory`）
3. 每日 `consolidate-memory` cron 提取模式 → pgvector `semantic_memory`
4. 每次对话通过 `buildMemoryContext()` 将 episodic + semantic 记忆注入 system prompt

### 数据模型

**`semantic_memory`（pgvector 向量）**
```
id UUID PK
user_id UUID FK
content text                     -- 记忆内容文本
embedding text                   -- 384维向量（Xenova/all-MiniLM-L6-v2）
importance text DEFAULT '5.0'
metadata jsonb
created_at timestamptz
```

**`episodic_memory`（SQLite本地）**
```
id text PK
content text
importance real DEFAULT 5.0
created_at text
expires_at text
metadata text (JSON)
```

### Agent Tools

| Tool | 职责 | 触发时机 |
|------|------|---------|
| `toolReflectOnDiary` | 回顾近期日记，生成洞察存入 semantic memory | 每7次对话触发 |
| `toolConsolidateMemory` | 清理低分记忆，提取模式 | 每日 cron |
| `toolGentlePrompt` | 推送轻柔提示到用户 | 定期、低重要性 |
| `toolSealLetter` | 直接创建信件（被 chat route 间接调用） | 用户确认寄信 |

### 主动触发机制

- **不主动提醒**：用户未上线时不推送通知，仅在 App 内通过 SSE 展示
- **Gentle Prompt**：存为 `chat_messages` 中特殊格式 `[gentle_prompt]...[/gentle_prompt]`，兔子下次对话时自然带出
- **RabbitCompanion 轮询**：前端每 60s 轮询 `GET /api/agent/notifications`

### Cron Jobs

| 路径 | 频率 | 职责 |
|------|------|------|
| `/api/cron/check-letters` | 每小时 | sealed → delivered |
| `/api/cron/consolidate-memory` | 每天凌晨3点 | 清理低分记忆，提取模式到 pgvector |

### AI 集成细节

### 贴纸生成 Prompt 模板
```
"cute Japanese sticker illustration of [KEYWORD], chibi style,
white background, thick black outline, kawaii, sticker sheet style,
no text, flat colors, simple"
```
服务端代理调用，Replicate 临时 URL 下载后上传至 Supabase（不暴露给客户端）。

### 兔子系统 Prompt 核心
```
你是 Shiro，一只黑白线条风格的兔子精灵，住在用户日记的角落里。
你的背景来自艺术疗愈与叙事疗法——
- 每次只问一个问题，从不连续提问
- 不给建议，除非被直接要求
- 语言简短温柔，每轮不超过 3-4 句
- 用省略号...创造留白
- 绝不诊断、开处方

当前上下文：[MOOD: {{mood}}] [WEATHER: {{weather}}] [DATE: {{date}}]
```

**信件触发时（兔子对话中检测到「未来的我」意图）：**
```
检测用户是否表达了面向未来的担忧或期望。
匹配模式：
- "不知道...会不会"
- "希望...后"
- "...的时候" + 时间词
- "希望...能"

如果检测到，注入：
"我注意到你提到了关于未来的想法……
你想把这句话封存起来，等 [时间] 后再收到吗？"

提取时间和主题后，询问用户确认。
```

---

## 信件系统 — 用户旅程

### 两种触发机制

**触发A — 兔子对话中：**
用户说："不知道三个月后的我会不会还因为A而焦虑呢？"
↓
兔子检测到「未来的我」+ 时间词，提取主题"A"和"三个月后"
↓
兔子回复用户询问："你希望把这句话封存起来，三个月后再收到吗？"
↓
用户确认 → 创建信件（content=A, topic=焦虑, trigger_time=三个月后, trigger_source=rabbit）
↓
月历该日期无标记（信件不绑定条目）；信件在后台等待

**触发B — 日记编辑器中：**
用户在画布文字上选中一段话，如"希望一个月后的我会B"
↓
浮动操作栏出现"寄信"按钮
↓
点击 → 弹出寄信弹窗，显示选中文本，可编辑，填写收信时间
↓
确认 → 创建信件（content=选中文字, trigger_source=diary_selection）

### 送达流程

1. **pg_cron（每小时）**：`UPDATE letters SET status='delivered' WHERE status='sealed' AND trigger_time <= now()`
2. **首页检查**：每次加载月历时查询 delivered 信件，按 trigger_time 倒序排列
3. **兔子提示**：有送达信件时，右下角兔子震动 + 显示小信封角标

### 拆信流程

用户回到 App，首页出现信封动画
↓
点击信封 → 进入信件页：展示信件内容 + 主题
↓
兔子轻声提示："这是你之前留给自己的……"
↓
用户写今日条目（创建 linked_response_entry_id）
↓
用户可选择再写一封新信，形成连续时间线

### 连续信封规则

- 拆信后原信件 status = 'opened'（永久保留，不可删除）
- 新写的信创建新信件记录
- linked_response_entry_id 串联同一条时间线上的所有条目

---

## 文件存储结构

```
bucket: unfold-private（私有，签名 URL）
  /{user_id}/photos/{uuid}.jpg
  /{user_id}/stickers/{uuid}.png
  /{user_id}/thumbnails/{entry_date}.png

bucket: unfold-public（CDN 公开）
  /stickers/preset/{category}/{name}.png    -- 按分类组织的预设贴纸（手帐核心素材）
  /backgrounds/paper/{name}.jpg             -- 和纸/牛皮纸/点阵/横线纸等纹理
  /backgrounds/color/{name}.jpg
  /borders/{name}.svg                       -- 花边、边框装饰元素
  /templates/{id}/preview.jpg
  /rabbit/{frame}.svg
  /fonts/                                   -- 日系手写字体（自托管，Google Fonts 补充）
```

canvas_state JSONB 中存储路径 key，不存签名 URL（避免过期问题），加载时动态生成签名 URL。

---

## 画布状态保存策略

- **防抖自动保存**：监听 Fabric.js `object:modified/added/removed` 事件，2秒防抖后调用 `POST /api/entries`
- **关闭保护**：`beforeunload` 事件触发 `navigator.sendBeacon` 同步保存（能在 tab 关闭后继续执行）
- **缩略图生成**：异步任务，服务端用 `fabric.StaticCanvas` + `node-canvas` 渲染为 400×300 JPEG

---

## 关键文件路径

| 文件 | 职责 |
|------|------|
| `app/(app)/editor/[date]/page.tsx` | 画布编辑器路由，生命周期管理 |
| `components/canvas/FabricCanvas.tsx` | Fabric.js React 封装，事件绑定，防抖保存 |
| `lib/fabric/serialization.ts` | 画布序列化/反序列化，签名 URL 解析 |
| `app/api/chat/route.ts` | Claude 流式对话，系统 prompt 构建，**信件意图检测**，注入记忆上下文 |
| `app/api/agent/notifications/route.ts` | 轮询 Gentle Prompt 通知 |
| `app/api/letters/route.ts` | 信件 CRUD，**兔子对话中创建信件** |
| `app/api/letters/due/route.ts` | 查询已送达待拆的信件 |
| `app/api/letters/[id]/open/route.ts` | 拆信 |
| `app/api/cron/check-letters/route.ts` | 每小时 cron：sealed → delivered |
| `app/api/cron/consolidate-memory/route.ts` | 每日 cron：清理低分记忆 + 提取模式 |
| `db/schema/index.ts` | Drizzle ORM 所有表定义（letters + semantic_memory 表） |
| `lib/agent/index.ts` | Bunny Agent 主循环，状态机，`buildMemoryContext()` |
| `lib/agent/tools.ts` | Agent Tools：`toolReflectOnDiary`、`toolConsolidateMemory`、`toolGentlePrompt` |
| `lib/memory/index.ts` | MemoryStore 接口定义（三层记忆类型） |
| `lib/memory/sqlite.ts` | Episodic Memory 实现（sql.js WASM） |
| `lib/memory/retrieval.ts` | Semantic Memory 实现（Supabase pgvector） |
| `lib/memory/sync.ts` | Supabase diary_entries → SQLite episodic 同步 |
| `components/rabbit/RabbitCompanion.tsx` | 兔子 UI 组件，动画，SSE 流式响应处理，**信件意图询问 UI** |
| `components/letter/LetterNotification.tsx` | 信件送达通知组件 |
| `components/letter/LetterSealModal.tsx` | 寄信弹窗（从编辑器或兔子触发） |
| `components/letter/LetterOpenView.tsx` | 拆信页（全屏动画） |
| `components/canvas/SelectionActionBar.tsx` | **编辑器文字选中浮动操作栏** |

---

## 验证方案

1. **画布保存**：编辑画布 → 刷新页面 → 画布状态完整恢复
2. **贴纸生成**：输入"披萨" → 5秒内返回卡通贴纸，可拖入画布
3. **兔子对话**：点击兔子 → 消息流式出现，不超过 3-4 句
4. **胶囊封存**：封存后日历出现信封图标，pg_cron 触发后状态变更
5. **胶囊拆封**：首页兔子提示 → 阅读留言 → 兔子提问（仅问封存的那个问题）→ 画布打开
6. **记忆注入**：对话中兔子能提及近期日记内容（Memory Context 生效）
7. **记忆 Consolidation**：daily cron 后 pgvector semantic_memory 有新记录
