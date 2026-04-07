'use client'

import { useState, useEffect } from 'react'

interface Sticker {
  id: string
  keyword: string
  image_url: string
  category: string
}

const WEATHER_MOODS = [
  { k: 'sunny', label: '晴', emoji: '☀️' },
  { k: 'cloudy', label: '多云', emoji: '⛅' },
  { k: 'rainy', label: '雨', emoji: '🌧️' },
  { k: 'snowy', label: '雪', emoji: '🌨️' },
  { k: 'joyful', label: '开心', emoji: '😊' },
  { k: 'serene', label: '平静', emoji: '😌' },
  { k: 'tender', label: '温柔', emoji: '🥰' },
  { k: 'heavy', label: '沉重', emoji: '😔' },
  { k: 'anxious', label: '焦虑', emoji: '😰' },
]

const PRESET_EMOJIS: Record<string, string[]> = {
  weather: ['☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌨️', '🌙', '⭐'],
  mood: ['😊', '😢', '😡', '😰', '🥰', '😴', '😌', '🤩', '🥺', '😤'],
  plant: ['🌸', '🌺', '🌻', '🌷', '🌹', '🌿', '🍀', '🌾', '🍃', '🪴'],
  food: ['🍎', '🍰', '☕', '🍵', '🍜', '🍣', '🍕', '🍦', '🍪', '🍫'],
  deco: ['💕', '🎀', '🎈', '🎨', '✂️', '📒', '✏️', '💌', '🔖', '✨'],
}

interface RightPanelProps {
  panel: string
  onSticker: (emoji: string) => void
  onImageUpload: (url: string) => void
  onMood: (mood: string, emoji: string) => void
  onAiGenerate: (keyword: string) => Promise<void>
  onClose: () => void
}

export default function RightPanel({
  panel, onSticker, onImageUpload, onMood, onAiGenerate, onClose,
}: RightPanelProps) {
  const [presets, setPresets] = useState<Sticker[]>([])
  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [tab, setTab] = useState('emoji')

  useEffect(() => {
    if (panel === 'sticker') {
      fetch('/api/stickers/generate')
        .then((r) => r.json())
        .then((d) => setPresets(d.stickers || []))
        .catch(() => {})
    }
  }, [panel])

  if (!panel) return null

  return (
    <div className="w-64 bg-surface border-l border-border flex flex-col overflow-y-auto">
      {/* Sticker Panel */}
      {panel === 'sticker' && (
        <div className="p-4">
          <div className="text-xs font-medium text-ink3 tracking-widest uppercase mb-3">预设贴纸</div>

          {/* Category tabs */}
          <div className="flex gap-1 mb-4 flex-wrap">
            {Object.keys(PRESET_EMOJIS).map((cat) => (
              <button
                key={cat}
                onClick={() => setTab(cat)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  tab === cat
                    ? 'bg-accent text-white border-accent'
                    : 'border-border text-ink2 hover:border-accent'
                }`}
              >
                {cat === 'weather' ? '天气' :
                 cat === 'mood' ? '心情' :
                 cat === 'plant' ? '植物' :
                 cat === 'food' ? '食物' : '装饰'}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-5 gap-2">
            {(PRESET_EMOJIS[tab] || []).map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSticker(emoji)}
                className="aspect-square rounded-lg bg-bg border border-border flex items-center justify-center text-xl hover:border-accent hover:scale-110 transition-all cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* AI-generated stickers */}
          {presets.length > 0 && (
            <>
              <div className="text-xs font-medium text-ink3 tracking-widest uppercase mt-5 mb-3">AI 贴纸</div>
              <div className="grid grid-cols-5 gap-2">
                {presets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onImageUpload(s.image_url)}
                    className="aspect-square rounded-lg bg-bg border border-border flex items-center justify-center text-xl hover:border-accent hover:scale-110 transition-all overflow-hidden"
                  >
                    <img src={s.image_url} alt={s.keyword} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* AI Generate Panel */}
      {panel === 'ai' && (
        <div className="p-4">
          <div className="text-xs font-medium text-ink3 tracking-widest uppercase mb-3">✨ AI 贴纸生成</div>
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="输入关键词，如：披萨、森林、可爱兔子"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors mb-3"
          />
          <button
            onClick={async () => {
              if (!aiPrompt.trim()) return
              setGenerating(true)
              try {
                await onAiGenerate(aiPrompt.trim())
                setAiPrompt('')
              } finally {
                setGenerating(false)
              }
            }}
            disabled={generating}
            className="w-full py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {generating ? '生成中…' : '生成并加入画布'}
          </button>
          <div className="mt-4 text-xs text-ink3 leading-relaxed">
            描述你想要的画面，AI 生成日系卡通风格贴纸。如"抱着猫的女孩"、"雨天咖啡馆"等。
          </div>
        </div>
      )}

      {/* Weather/Mood Panel */}
      {panel === 'weather' && (
        <div className="p-4">
          <div className="text-xs font-medium text-ink3 tracking-widest uppercase mb-3">🌤 天气 & 心情</div>
          <div className="flex flex-wrap gap-2">
            {WEATHER_MOODS.map((m) => (
              <button
                key={m.k}
                onClick={() => onMood(m.k, m.emoji)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm hover:border-accent hover:text-accent transition-colors"
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Background Panel */}
      {panel === 'bg' && (
        <div className="p-4">
          <div className="text-xs font-medium text-ink3 tracking-widest uppercase mb-3">🎨 背景</div>
          <BackgroundPicker />
        </div>
      )}

      {/* Font Panel */}
      {panel === 'font' && (
        <div className="p-4">
          <div className="text-xs font-medium text-ink3 tracking-widest uppercase mb-3">✏ 字体</div>
          <FontPicker />
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-auto p-3 text-center text-xs text-ink3 hover:text-ink border-t border-border"
      >
        关闭
      </button>
    </div>
  )
}

function BackgroundPicker() {
  const bgs = [
    { id: 'paper1', color: '#f5f0e8', label: '米白格纹' },
    { id: 'paper2', color: '#faf8f5', label: '纯白' },
    { id: 'paper3', color: '#fef9f3', label: '暖白' },
    { id: 'paper4', color: '#f0f4f8', label: '淡蓝' },
    { id: 'dotted', color: '#ffffff', label: '点阵', pattern: true },
    { id: 'lined', color: '#ffffff', label: '横线', pattern: true },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {bgs.map((bg) => (
        <button
          key={bg.id}
          className="aspect-square rounded-lg border-2 border-border hover:border-accent transition-colors flex items-center justify-center text-xs text-ink2"
          style={{ backgroundColor: bg.color }}
          title={bg.label}
        >
          {bg.pattern ? bg.label : ''}
        </button>
      ))}
    </div>
  )
}

function FontPicker() {
  const fonts = [
    { id: 'zen_kurenaido', label: 'Zen Kurenaido', family: "'Zen Kurenaido', serif" },
    { id: 'shippori_mincho', label: 'Shippori Mincho', family: "'Shippori Mincho', serif" },
    { id: 'noto_serif', label: 'Noto Serif SC', family: "'Noto Serif SC', serif" },
    { id: 'zcool_xiaowei', label: '站酷小薇', family: "'ZCOOL XiaoWei', serif" },
    { id: 'noto_sans', label: 'Noto Sans SC', family: "'Noto Sans SC', sans-serif" },
  ]

  return (
    <div className="flex flex-col gap-2">
      {fonts.map((f) => (
        <button
          key={f.id}
          className="text-left px-3 py-2 rounded-lg border border-border hover:border-accent transition-colors text-sm"
          style={{ fontFamily: f.family }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
