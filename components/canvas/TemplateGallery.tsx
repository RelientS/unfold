'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Template {
  id: string
  name: string
  preview_url: string | null
  canvas_state: Record<string, unknown> | null
  category: string
}

interface TemplateGalleryProps {
  onSelect: (templateId: string, initialJson?: Record<string, unknown>) => void
  onClose: () => void
}

export default function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface rounded-2xl w-full max-w-2xl p-8 shadow-float max-h-[80vh] overflow-y-auto"
      >
        <h3 className="font-serif text-lg font-normal mb-1">选择版式</h3>
        <p className="text-xs text-ink3 mb-6">从一个版式开始，或从空白画布自由创作</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full bg-accent animate-bounce animate-bounce-delay-${i}`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Blank option */}
            <button
              onClick={() => onSelect('blank')}
              className="aspect-[4/5] rounded-xl border-2 border-dashed border-border hover:border-accent transition-colors flex flex-col items-center justify-center gap-2 text-ink3 hover:text-accent"
            >
              <span className="text-3xl">✎</span>
              <span className="text-sm">空白画布</span>
            </button>

            {/* Templates */}
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id, t.canvas_state || undefined)}
                className="aspect-[4/5] rounded-xl border border-border hover:border-accent transition-colors overflow-hidden flex flex-col"
              >
                <div className="flex-1 bg-bg flex items-center justify-center">
                  {t.preview_url ? (
                    <img src={t.preview_url} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">📄</span>
                  )}
                </div>
                <div className="px-3 py-2 text-left border-t border-border">
                  <div className="text-sm text-ink">{t.name}</div>
                  <div className="text-xs text-ink3">{t.category}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-sm text-ink3 hover:text-ink"
          >
            取消
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
