'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CapsuleModalProps {
  entryId: string
  onClose: () => void
  onSealed: () => void
}

export default function CapsuleModal({ entryId, onClose, onSealed }: CapsuleModalProps) {
  const [note, setNote] = useState('')
  const [question, setQuestion] = useState('')
  const [duration, setDuration] = useState('3month')
  const [customDate, setCustomDate] = useState('')
  const [loading, setLoading] = useState(false)

  async function seal() {
    setLoading(true)
    try {
      let unlockAt: string
      if (duration === 'custom' && customDate) {
        unlockAt = customDate
      } else {
        const months: Record<string, number> = {
          month: 1, '3month': 3, '6month': 6, year: 12,
        }
        const d = new Date()
        d.setMonth(d.getMonth() + (months[duration] || 3))
        unlockAt = d.toISOString()
      }

      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: entryId,
          note_to_future_self: note,
          rabbit_question: question,
          unlock_at: unlockAt,
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface rounded-2xl w-full max-w-md p-8 shadow-float"
        >
          <h3 className="font-serif text-lg font-normal mb-1">✉ 封存时刻</h3>
          <p className="text-xs text-ink3 mb-6">亲手决定，什么值得被未来的自己看见</p>

          {/* Note to future self */}
          <div className="mb-4">
            <label className="text-xs text-ink2 mb-2 block">写给未来自己的话（可选）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="三个月后的你，会看到这段话……"
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 font-serif text-sm leading-relaxed resize-none outline-none focus:border-accent transition-colors min-h-[100px]"
            />
          </div>

          {/* Rabbit question */}
          <div className="mb-4">
            <label className="text-xs text-ink2 mb-2 block">希望兔子在未来问你一个问题（可选）</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="比如：现在的你，实现当时的愿望了吗？"
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 font-serif text-sm leading-relaxed resize-none outline-none focus:border-accent transition-colors min-h-[80px]"
            />
          </div>

          {/* Duration */}
          <div className="mb-6">
            <label className="text-xs text-ink2 mb-2 block">拆封时间</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { v: 'month', l: '1个月后' },
                { v: '3month', l: '3个月后' },
                { v: '6month', l: '6个月后' },
                { v: 'year', l: '1年后' },
                { v: 'custom', l: '自定义' },
              ].map((opt) => (
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
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg text-sm text-ink2 hover:border-accent hover:text-accent transition-colors"
            >
              取消
            </button>
            <button
              onClick={seal}
              disabled={loading}
              className="px-5 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {loading ? '封存中…' : '封存'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
