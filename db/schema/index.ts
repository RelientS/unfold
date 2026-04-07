import { pgTable, uuid, text, timestamp, date, jsonb, boolean, unique } from 'drizzle-orm/pg-core'

// ── Profiles (extends Supabase auth.users) ────────────────────────────────────
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
  username: text('username'),
  avatarUrl: text('avatar_url'),
  timezone: text('timezone').default('Asia/Shanghai'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ── Auth users (reference only — managed by Supabase) ─────────────────────────
export const authUsers = pgTable('auth_users', {
  id: uuid('id').primaryKey(),
})

// ── Diary Entries ─────────────────────────────────────────────────────────────
export const diaryEntries = pgTable('diary_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  canvasState: jsonb('canvas_state').$type<Record<string, unknown>>(),
  thumbnailUrl: text('thumbnail_url'),
  templateId: text('template_id').default('blank'),
  mood: text('mood'), // serene | joyful | heavy | anxious | tender
  weather: text('weather'), // sunny | cloudy | rainy | snowy
  backgroundId: text('background_id'),
  fontId: text('font_id'),
  isSealed: boolean('is_sealed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userDateUnique: unique().on(table.userId, table.entryDate),
}))

// ── Stickers ──────────────────────────────────────────────────────────────────
export const stickers = pgTable('stickers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }), // null = preset
  source: text('source').notNull(), // 'preset' | 'ai_generated' | 'user_uploaded'
  keyword: text('keyword'),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  category: text('category'), // washi_tape | photo_frame | deco | food | nature | travel | mood
  styleTag: text('style_tag'), // cute | ink | minimal | retro
  createdAt: timestamp('created_at').defaultNow(),
})

// ── Templates ─────────────────────────────────────────────────────────────────
export const templates = pgTable('templates', {
  id: text('id').primaryKey(), // 'weekly' | 'travel' | 'monthly' | 'blank'
  name: text('name').notNull(),
  previewUrl: text('preview_url'),
  canvasState: jsonb('canvas_state').$type<Record<string, unknown>>(),
  category: text('category'), // planning | journal | travel | seasonal
})

// ── Letters (信) ──────────────────────────────────────────────────────────────
export const letters = pgTable('letters', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),          // 信件正文
  topic: text('topic'),                       // 主题关键词
  triggerSource: text('trigger_source').notNull().default('rabbit'), // 'rabbit' | 'diary_selection'
  triggerTime: timestamp('trigger_time').notNull(), // 何时送达
  status: text('status').notNull().default('sealed'), // sealed | delivered | opened
  sealedAt: timestamp('sealed_at').defaultNow(),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  linkedResponseEntryId: uuid('linked_response_entry_id').references(() => diaryEntries.id),
})

// ── Chat Sessions ─────────────────────────────────────────────────────────────
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  entryId: uuid('entry_id').references(() => diaryEntries.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  endedAt: timestamp('ended_at'),
})

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export type Profile = typeof profiles.$inferSelect
export type DiaryEntry = typeof diaryEntries.$inferSelect
export type Sticker = typeof stickers.$inferSelect
export type Template = typeof templates.$inferSelect
export type Letter = typeof letters.$inferSelect
export type ChatSession = typeof chatSessions.$inferSelect
export type ChatMessage = typeof chatMessages.$inferSelect

// ── Semantic Memory (pgvector) ─────────────────────────────────────────────────
export const semanticMemory = pgTable('semantic_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: text('embedding').notNull(), // stored as array via Supabase
  importance: text('importance').default('5.0'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow(),
})

export type SemanticMemory = typeof semanticMemory.$inferSelect
