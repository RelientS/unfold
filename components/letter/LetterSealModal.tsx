'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LetterSealModalProps {
  open: boolean
  initialContent: string
  initialTriggerTime: string | null
  topic: string
  source: 'rabbit' | 'diary_selection'
  onClose: () => void
  onSealed: () => void
}

const DURATION_OPTIONS = [
  { v: 'month', l: '1个月后' },
  { v: '3month', l: '3个月后' },
  { v: '6month', l: '6个月后' },
  { v: 'year', l: '1年后' },
  { v: 'custom', l: '自定义' },
]

function calcTriggerTime(v: string, custom?: string): string {
  if (v === 'custom' && custom) return custom
  const months: Record<string, number> = { month: 1, '3month': 3, '6month': 6, year: 12 }
  const d = new Date()
  d.setMonth(d.getMonth() + (months[v] || 3))
  return d.toISOString()
}

export default function LetterSealModal({
  open, initialContent, initialTriggerTime, topic, source, onClose, onSealed,
}: LetterSealModalProps) {
  const [content, setContent] = useState(initialContent || '')
  const [duration, setDuration] = useState('3month')
  const [customDate, setCustomDate] = useState('')
  const [loading, setLoading] = useState(false)

  async function seal() {
    if (!content.trim()) return
    setLoading(true)
    try {
      const triggerTime = calcTriggerTime(duration, customDate)
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          topic: topic || null,
          trigger_source: source,
          trigger_time: triggerTime,
        }),
      })
      if (res.ok) {
        onSealed()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface rounded-2xl w-full max-w-md p-8 shadow-float"
          >
            <h3 className="font-serif text-lg font-normal mb-1">✉ 写一封信给未来的自己</h3>
            <p className="text-xs text-ink3 mb-6">
              {source === 'rabbit' ? '兔子帮你记住了这句话' : '选中文字将作为信件内容'}
              {topic ? ` · 主题：${topic}` : ''}
            </p>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="你想对未来的自己说什么……"
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 font-serif text-sm leading-relaxed resize-none outline-none focus:border-accent transition-colors min-h-[120px] mb-4"
              autoFocus
            />

            <div className="mb-6">
              <label className="text-xs text-ink2 mb-2 block">什么时候送达？</label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setDuration(opt.v)}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                      duration === opt.v
                        ? 'bg-accent text-white border-accent'
                        : 'border-border text-ink2 hover:border-accent'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
              {duration === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="mt-2 bg-bg border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                  min={new Date().toISOString().slice(0, 10)}
                />
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-border rounded-lg text-sm text-ink2 hover:border-accent hover:text-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={seal}
                disabled={!content.trim() || loading}
                className="px-5 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {loading ? '封存中…' : '封存信件'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
